/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.assurance.SignOffRecordRepository;
import com.wesee.esg.climate.EmissionActivityEntry;
import com.wesee.esg.climate.EmissionActivityEntryRepository;
import com.wesee.esg.climate.EmissionScope;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.denominator.AnnualFigureKey;
import com.wesee.esg.denominator.CompanyAnnualFigureRepository;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.supplychain.dto.PublishDisclosureRequest;
import com.wesee.esg.supplychain.dto.SharedDisclosureDto;
import com.wesee.esg.supplychain.dto.SharedDisclosureLineDto;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Publishing a signed-off year to one buyer, and reading what has been published.
 *
 * <p>The basis defaults to the supplier's recorded {@code PRODUCTION_OUTPUT} for that fiscal year
 * — the same figure the intensity metrics divide by, entered once on the denominators screen.
 */
@Service
public class SharedDisclosureService {

    private final SupplyLinkRepository supplyLinkRepository;
    private final SharedDisclosureRepository disclosureRepository;
    private final SharedDisclosureLineRepository lineRepository;
    private final SignOffRecordRepository signOffRepository;
    private final EmissionActivityEntryRepository activityRepository;
    private final CompanyAnnualFigureRepository figureRepository;
    private final CompanyRepository companyRepository;
    private final CurrentUserProvider currentUserProvider;

    public SharedDisclosureService(SupplyLinkRepository supplyLinkRepository,
                                   SharedDisclosureRepository disclosureRepository,
                                   SharedDisclosureLineRepository lineRepository,
                                   SignOffRecordRepository signOffRepository,
                                   EmissionActivityEntryRepository activityRepository,
                                   CompanyAnnualFigureRepository figureRepository,
                                   CompanyRepository companyRepository,
                                   CurrentUserProvider currentUserProvider) {
        this.supplyLinkRepository = supplyLinkRepository;
        this.disclosureRepository = disclosureRepository;
        this.lineRepository = lineRepository;
        this.signOffRepository = signOffRepository;
        this.activityRepository = activityRepository;
        this.figureRepository = figureRepository;
        this.companyRepository = companyRepository;
        this.currentUserProvider = currentUserProvider;
    }

    /** What this company has published to its buyers. */
    @Transactional(readOnly = true)
    public List<SharedDisclosureDto> listMine() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return disclosureRepository.findForSupplier(companyId).stream()
                .map(d -> toDto(d, buyerNameOf(d)))
                .toList();
    }

    /** What this company's suppliers have published to it. */
    @Transactional(readOnly = true)
    public List<SharedDisclosureDto> listAvailableToBuy() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return disclosureRepository.findPublishedForBuyer(companyId).stream()
                .map(d -> toDto(d, supplierNameOf(d)))
                .toList();
    }

    @Transactional
    public SharedDisclosureDto publish(UUID linkId, PublishDisclosureRequest request) {
        UUID supplierCompanyId = currentUserProvider.requireCompanyId();
        int fiscalYear = request.fiscalYear();

        // A link this caller is not the SUPPLIER of is a NotFoundException, not a Forbidden:
        // telling a stranger that a link exists is itself a leak.
        SupplyLink link = supplyLinkRepository.findByIdAndSupplierCompanyId(linkId, supplierCompanyId)
                .orElseThrow(() -> new NotFoundException("No such supply link"));
        if (link.getStatus() != SupplyLinkStatus.ACTIVE) {
            throw new ConflictException("That link is not active, so there is nobody to publish to");
        }

        PublishGuard.requirePublishable(
                signOffRepository.findByCompanyIdAndFiscalYear(supplierCompanyId, fiscalYear).orElse(null),
                fiscalYear);
        var signOff = signOffRepository.findByCompanyIdAndFiscalYear(supplierCompanyId, fiscalYear).orElseThrow();

        List<EmissionActivityEntry> entries = activityRepository
                .findByCompanyIdAndFiscalYearOrderByCreatedAtAscIdAsc(supplierCompanyId, fiscalYear);
        if (entries.isEmpty()) {
            throw new ConflictException("FY" + fiscalYear + " has no emission activity recorded,"
                    + " so there is no footprint to share");
        }

        BigDecimal basisQuantity = request.basisQuantity() != null
                ? request.basisQuantity()
                : figureRepository.findByCompanyIdAndFiscalYearAndFigureKey(
                                supplierCompanyId, fiscalYear, AnnualFigureKey.PRODUCTION_OUTPUT)
                        .map(f -> f.getValue())
                        .orElseThrow(() -> new ConflictException(
                                "Record your production output for FY" + fiscalYear + " on the"
                                        + " denominators screen, or give a basis here — the buyer"
                                        + " divides its purchase by it"));
        if (basisQuantity.signum() <= 0) {
            throw new ConflictException("The basis quantity must be greater than zero");
        }
        String basisUnit = request.basisUnit() != null && !request.basisUnit().isBlank()
                ? request.basisUnit()
                : AnnualFigureKey.PRODUCTION_OUTPUT.canonicalUnit();

        // Re-signing produces a NEW snapshot and marks the old one. The figure a buyer cited last
        // quarter does not change underneath its own audit trail.
        disclosureRepository.findLiveForLinkAndYear(linkId, fiscalYear).ifPresent(previous -> {
            previous.setRevokedAt(Instant.now());
            previous.setRevocationReason("Superseded by a newer publication");
            disclosureRepository.save(previous);
            // Flush before inserting the replacement. The partial unique index on
            // (supply_link_id, fiscal_year) WHERE revoked_at IS NULL sees the old row as still
            // live until this update reaches the database, and JPA would otherwise defer it to
            // commit — the insert below then collides with the row it just superseded.
            disclosureRepository.flush();
        });

        SharedDisclosure disclosure = new SharedDisclosure();
        disclosure.setSupplyLinkId(linkId);
        disclosure.setFiscalYear(fiscalYear);
        disclosure.setScope1Tco2e(totalFor(entries, EmissionScope.SCOPE_1));
        disclosure.setScope2Tco2e(totalFor(entries, EmissionScope.SCOPE_2));
        disclosure.setBasisQuantity(basisQuantity);
        disclosure.setBasisUnit(basisUnit);
        disclosure.setSignOffHash(signOff.getHash());
        disclosure.setSignerName(signOff.getSignerName());
        disclosure.setSignedAt(signOff.getSignedAt());
        disclosure.setPublishedAt(Instant.now());
        disclosure = disclosureRepository.save(disclosure);

        UUID disclosureId = disclosure.getId();
        // Scope 3 lines are deliberately excluded: passing a supplier's own upstream estimate to a
        // buyer that is computing ITS Scope 3 from this would double-count the same tonnes.
        lineRepository.saveAll(entries.stream()
                .filter(e -> e.getEmissionFactor().getScope() != EmissionScope.SCOPE_3)
                .map(e -> SnapshotCopy.lineFrom(e, disclosureId))
                .toList());

        return toDto(disclosure, buyerNameOf(disclosure));
    }

    /** Sets a flag; never deletes. A buyer must see that what it cited has been withdrawn. */
    @Transactional
    public void revoke(UUID disclosureId, String reason) {
        UUID companyId = currentUserProvider.requireCompanyId();
        SharedDisclosure disclosure = disclosureRepository.findByIdForSupplier(disclosureId, companyId)
                .orElseThrow(() -> new NotFoundException("No such published disclosure"));
        if (disclosure.getRevokedAt() != null) {
            throw new ConflictException("That disclosure has already been withdrawn");
        }
        disclosure.setRevokedAt(Instant.now());
        disclosure.setRevocationReason(reason);
        disclosureRepository.save(disclosure);
    }

    private BigDecimal totalFor(List<EmissionActivityEntry> entries, EmissionScope scope) {
        return entries.stream()
                .filter(e -> e.getEmissionFactor().getScope() == scope)
                .map(EmissionActivityEntry::getCalculatedTco2e)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private SharedDisclosureDto toDto(SharedDisclosure d, String counterpartyName) {
        return SharedDisclosureDto.from(d, counterpartyName,
                disclosureRepository.existsNewerThan(d.getId()),
                lineRepository.findByDisclosureIdOrderByScopeAsc(d.getId()).stream()
                        .map(SharedDisclosureLineDto::from).toList());
    }

    private String buyerNameOf(SharedDisclosure d) {
        return supplyLinkRepository.findById(d.getSupplyLinkId())
                .map(SupplyLink::getBuyerCompanyId)
                .flatMap(companyRepository::findById)
                .map(Company::getName)
                .orElse(null);
    }

    private String supplierNameOf(SharedDisclosure d) {
        return supplyLinkRepository.findById(d.getSupplyLinkId())
                .map(SupplyLink::getSupplierCompanyId)
                .flatMap(companyRepository::findById)
                .map(Company::getName)
                .orElse(null);
    }
}
