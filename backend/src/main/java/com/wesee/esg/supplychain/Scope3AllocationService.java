/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.assurance.SignOffLock;
import com.wesee.esg.climate.EmissionsService;
import com.wesee.esg.climate.Scope3Category;
import com.wesee.esg.climate.Scope3Value;
import com.wesee.esg.climate.Scope3ValueRepository;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.supplychain.dto.AllocateRequest;
import com.wesee.esg.supplychain.dto.Scope3AllocationDto;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * The buyer's side: divide a supplier's published footprint by the share of its output you bought,
 * and put the result into your own Scope 3.
 *
 * <p>The allocated figure enters through {@link EmissionActivityService#addEntry}, the same path
 * an accepted extraction takes, so sign-off, the assurance hash and the CSV export pick it up with
 * no changes. The factor it uses is a unit conversion (1000 kgCO2e per tCO2e), not an estimate.
 */
@Service
public class Scope3AllocationService {

    /** Purchased goods and services. The only category this feature writes today. */
    static final int PURCHASED_GOODS_CATEGORY = 1;

    private static final int TCO2E_SCALE = 4;

    private final Scope3AllocationRepository allocationRepository;
    private final SharedDisclosureRepository disclosureRepository;
    private final SupplyLinkRepository supplyLinkRepository;
    private final EmissionsService emissionsService;
    private final Scope3ValueRepository scope3ValueRepository;
    private final CompanyRepository companyRepository;
    private final CurrentUserProvider currentUserProvider;
    private final SignOffLock signOffLock;

    public Scope3AllocationService(Scope3AllocationRepository allocationRepository,
                                   SharedDisclosureRepository disclosureRepository,
                                   SupplyLinkRepository supplyLinkRepository,
                                   EmissionsService emissionsService,
                                   Scope3ValueRepository scope3ValueRepository,
                                   CompanyRepository companyRepository,
                                   CurrentUserProvider currentUserProvider,
                                   SignOffLock signOffLock) {
        this.allocationRepository = allocationRepository;
        this.disclosureRepository = disclosureRepository;
        this.supplyLinkRepository = supplyLinkRepository;
        this.emissionsService = emissionsService;
        this.scope3ValueRepository = scope3ValueRepository;
        this.companyRepository = companyRepository;
        this.currentUserProvider = currentUserProvider;
        this.signOffLock = signOffLock;
    }

    @Transactional(readOnly = true)
    public List<Scope3AllocationDto> list() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return allocationRepository.findByCompanyIdOrderByFiscalYearDesc(companyId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public Scope3AllocationDto allocate(UUID disclosureId, AllocateRequest request) {
        UUID buyerCompanyId = currentUserProvider.requireCompanyId();

        SharedDisclosure disclosure = disclosureRepository
                .findByIdForBuyer(disclosureId, buyerCompanyId)
                .orElseThrow(() -> new NotFoundException("No such shared disclosure"));
        if (disclosure.getRevokedAt() != null) {
            throw new ConflictException("Your supplier has withdrawn that disclosure,"
                    + " so it cannot be newly cited");
        }

        // The allocation moves a reported Scope 3 figure now, so a signed year refuses it — the
        // same rule extraction and the activity ledger already apply.
        requireYearOpen(buyerCompanyId, disclosure.getFiscalYear());

        BigDecimal share = Allocation.share(request.purchasedQuantity(), disclosure.getBasisQuantity());
        BigDecimal allocated = Allocation.allocate(
                disclosure.getScope1Tco2e(), disclosure.getScope2Tco2e(), share);

        // Keyed on the RELATIONSHIP, not the snapshot. A republish creates a new disclosure id, and
        // keying on that let the buyer allocate the same purchase twice — once against each
        // snapshot — with nothing warning and the UI inviting it.
        Scope3Allocation allocation = allocationRepository
                .findForLinkAndYear(buyerCompanyId, disclosure.getSupplyLinkId(), disclosure.getFiscalYear())
                .orElseGet(() -> {
                    Scope3Allocation a = new Scope3Allocation();
                    a.setCompanyId(buyerCompanyId);
                    return a;
                });
        // Re-point it at the snapshot actually being drawn from, which may be a newer one.
        allocation.setSharedDisclosureId(disclosureId);

        allocation.setFiscalYear(disclosure.getFiscalYear());
        allocation.setPurchasedQuantity(request.purchasedQuantity());
        allocation.setPurchasedUnit(disclosure.getBasisUnit());
        allocation.setShareFraction(share);
        allocation.setAllocatedTco2e(allocated);
        allocation.setGhgCategory(PURCHASED_GOODS_CATEGORY);
        allocationRepository.save(allocation);

        publishCategoryTotal(buyerCompanyId, disclosure.getFiscalYear());
        return toDto(allocation);
    }

    /** Removes the allocation and takes the emissions it contributed back out of Scope 3. */
    @Transactional
    public void remove(UUID allocationId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Scope3Allocation allocation = allocationRepository.findByIdAndCompanyId(allocationId, companyId)
                .orElseThrow(() -> new NotFoundException("No such allocation"));
        int fiscalYear = allocation.getFiscalYear();
        requireYearOpen(companyId, fiscalYear);
        allocationRepository.delete(allocation);
        allocationRepository.flush();
        publishCategoryTotal(companyId, fiscalYear);
    }

    /**
     * Writes the year's allocations into the buyer's reported Scope 3 Category 1.
     *
     * <p>This is the step the first implementation got wrong: it wrote an
     * {@code emission_activity_entry} instead, and nothing reads those into a reported Scope 3
     * figure — {@code EmissionsService} calls {@code scopeSeries} for scopes 1 and 2 only, and
     * takes Scope 3 entirely from {@code scope3_value}. The figure is a sum rather than a delta so
     * that removing an allocation is the same code path as adding one.
     */
    private void publishCategoryTotal(UUID companyId, int fiscalYear) {
        // Categories are created lazily, so a buyer that has never opened the Emissions screen has
        // none. Bring them into existence rather than refusing the allocation over it.
        Scope3Category category = emissionsService.requireStandardCategory(companyId, PURCHASED_GOODS_CATEGORY);

        BigDecimal total = categoryTotal(
                allocationRepository.findByCompanyIdOrderByFiscalYearDesc(companyId),
                fiscalYear, PURCHASED_GOODS_CATEGORY);

        Scope3Value value = scope3ValueRepository
                .findByCategoryIdAndFiscalYear(category.getId(), fiscalYear)
                .orElseGet(() -> {
                    Scope3Value v = new Scope3Value();
                    v.setCompanyId(companyId);
                    v.setCategory(category);
                    v.setFiscalYear(fiscalYear);
                    return v;
                });
        value.setValue(total);
        scope3ValueRepository.save(value);
    }

    private void requireYearOpen(UUID companyId, int fiscalYear) {
        signOffLock.requireYearOpen(companyId, fiscalYear, "changing what it reports");
    }

    /** Pure, so the summing is testable without a database. */
    static BigDecimal categoryTotal(List<Scope3Allocation> allocations, int fiscalYear, int ghgCategory) {
        return allocations.stream()
                .filter(a -> a.getFiscalYear() != null && a.getFiscalYear() == fiscalYear)
                .filter(a -> a.getGhgCategory() != null && a.getGhgCategory() == ghgCategory)
                .map(Scope3Allocation::getAllocatedTco2e)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(TCO2E_SCALE, java.math.RoundingMode.HALF_UP);
    }

    private Scope3AllocationDto toDto(Scope3Allocation a) {
        // Bound, not findById. An unbound read kept serving the supplier's basis, total and name
        // on every page load after the link was revoked — revocation is supposed to end that.
        // What the allocation itself stores (quantity, share, allocated tonnes) is enough for the
        // audit trail once the source is gone.
        SharedDisclosure d = disclosureRepository
                .findByIdForBuyer(a.getSharedDisclosureId(), a.getCompanyId())
                .orElse(null);
        String supplierName = d == null ? null : supplyLinkRepository.findById(d.getSupplyLinkId())
                .map(SupplyLink::getSupplierCompanyId)
                .flatMap(companyRepository::findById)
                .map(Company::getName)
                .orElse(null);
        return Scope3AllocationDto.from(a, supplierName,
                d == null ? null : d.getBasisQuantity(),
                d == null ? null : d.getScope1Tco2e().add(d.getScope2Tco2e()),
                // The allocation keeps citing the snapshot it used; the UI only says a newer one
                // exists. Nothing re-allocates by itself.
                d != null && disclosureRepository.existsNewerThan(d.getId()),
                d == null || d.getRevokedAt() != null);
    }
}
