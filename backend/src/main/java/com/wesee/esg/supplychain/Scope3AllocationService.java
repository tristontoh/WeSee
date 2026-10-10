/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.climate.EmissionActivityEntryRepository;
import com.wesee.esg.climate.EmissionActivityService;
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

    /** Seeded in V91. A unit conversion, so the arithmetic below stays an identity. */
    static final String ALLOCATION_FACTOR_ID = "SUPPLIER_ALLOCATED_S3C1";

    private final Scope3AllocationRepository allocationRepository;
    private final SharedDisclosureRepository disclosureRepository;
    private final SupplyLinkRepository supplyLinkRepository;
    private final EmissionActivityService emissionActivityService;
    private final EmissionActivityEntryRepository activityRepository;
    private final CompanyRepository companyRepository;
    private final CurrentUserProvider currentUserProvider;

    public Scope3AllocationService(Scope3AllocationRepository allocationRepository,
                                   SharedDisclosureRepository disclosureRepository,
                                   SupplyLinkRepository supplyLinkRepository,
                                   EmissionActivityService emissionActivityService,
                                   EmissionActivityEntryRepository activityRepository,
                                   CompanyRepository companyRepository,
                                   CurrentUserProvider currentUserProvider) {
        this.allocationRepository = allocationRepository;
        this.disclosureRepository = disclosureRepository;
        this.supplyLinkRepository = supplyLinkRepository;
        this.emissionActivityService = emissionActivityService;
        this.activityRepository = activityRepository;
        this.companyRepository = companyRepository;
        this.currentUserProvider = currentUserProvider;
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

        BigDecimal share = Allocation.share(request.purchasedQuantity(), disclosure.getBasisQuantity());
        BigDecimal allocated = Allocation.allocate(
                disclosure.getScope1Tco2e(), disclosure.getScope2Tco2e(), share);

        Scope3Allocation allocation = allocationRepository
                .findByCompanyIdAndSharedDisclosureId(buyerCompanyId, disclosureId)
                .orElseGet(() -> {
                    Scope3Allocation a = new Scope3Allocation();
                    a.setCompanyId(buyerCompanyId);
                    a.setSharedDisclosureId(disclosureId);
                    return a;
                });

        // Re-entering a quantity corrects the figure rather than adding a second one, so the
        // buyer's Scope 3 never carries two versions of the same purchase.
        if (allocation.getEmissionActivityEntryId() != null) {
            activityRepository.findByIdAndCompanyId(allocation.getEmissionActivityEntryId(), buyerCompanyId)
                    .ifPresent(e -> emissionActivityService.deleteEntry(e.getId()));
        }

        allocation.setFiscalYear(disclosure.getFiscalYear());
        allocation.setPurchasedQuantity(request.purchasedQuantity());
        allocation.setPurchasedUnit(disclosure.getBasisUnit());
        allocation.setShareFraction(share);
        allocation.setAllocatedTco2e(allocated);
        allocation.setGhgCategory(1);

        var entry = emissionActivityService.addEntry(
                disclosure.getFiscalYear(), ALLOCATION_FACTOR_ID, allocated);
        allocation.setEmissionActivityEntryId(entry.id());

        return toDto(allocationRepository.save(allocation));
    }

    /** Removes the allocation and the emissions it put into the buyer's ledger. */
    @Transactional
    public void remove(UUID allocationId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Scope3Allocation allocation = allocationRepository.findByIdAndCompanyId(allocationId, companyId)
                .orElseThrow(() -> new NotFoundException("No such allocation"));
        if (allocation.getEmissionActivityEntryId() != null) {
            activityRepository.findByIdAndCompanyId(allocation.getEmissionActivityEntryId(), companyId)
                    .ifPresent(e -> emissionActivityService.deleteEntry(e.getId()));
        }
        allocationRepository.delete(allocation);
    }

    private Scope3AllocationDto toDto(Scope3Allocation a) {
        SharedDisclosure d = disclosureRepository.findById(a.getSharedDisclosureId()).orElse(null);
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
                d != null && d.getRevokedAt() != null);
    }
}
