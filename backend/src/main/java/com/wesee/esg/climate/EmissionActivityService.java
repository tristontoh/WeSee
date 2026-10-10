/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import com.wesee.esg.climate.dto.EmissionActivityEntryResponse;
import com.wesee.esg.climate.dto.EmissionFactorResponse;
import com.wesee.esg.climate.dto.SetEmissionValueRequest;
import com.wesee.esg.assurance.SignOffRecord;
import com.wesee.esg.assurance.SignOffRecordRepository;
import com.wesee.esg.assurance.SignOffStatus;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.extraction.SignOffGuard;
import java.util.Set;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
public class EmissionActivityService {

    private static final BigDecimal KG_PER_TONNE = BigDecimal.valueOf(1000);

    private final EmissionFactorRepository factorRepository;
    private final EmissionActivityEntryRepository entryRepository;
    private final EmissionsService emissionsService;
    private final CurrentUserProvider currentUserProvider;
    private final SignOffRecordRepository signOffRepository;

    public EmissionActivityService(EmissionFactorRepository factorRepository,
                                    EmissionActivityEntryRepository entryRepository,
                                    EmissionsService emissionsService,
                                    CurrentUserProvider currentUserProvider,
                                  SignOffRecordRepository signOffRepository) {
        this.factorRepository = factorRepository;
        this.entryRepository = entryRepository;
        this.emissionsService = emissionsService;
        this.currentUserProvider = currentUserProvider;
        this.signOffRepository = signOffRepository;
    }

    @Transactional(readOnly = true)
    public List<EmissionFactorResponse> listFactors() {
        return factorRepository.findAllByOrderByScopeAscNameAsc().stream().map(EmissionFactorResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<EmissionActivityEntryResponse> listEntries(int fiscalYear) {
        return entryRepository.findByCompanyIdAndFiscalYearOrderByCreatedAtAscIdAsc(currentUserProvider.requireCompanyId(), fiscalYear).stream()
                .map(EmissionActivityEntryResponse::from)
                .toList();
    }

    @Transactional
    public EmissionActivityEntryResponse addEntry(int fiscalYear, String factorId, BigDecimal quantity) {
        requireYearOpen(fiscalYear);
        EmissionFactor factor = factorRepository.findById(factorId)
                .orElseThrow(() -> new NotFoundException("Unknown emission factor: " + factorId));

        EmissionActivityEntry entry = new EmissionActivityEntry();
        entry.setCompanyId(currentUserProvider.requireCompanyId());
        entry.setFiscalYear(fiscalYear);
        entry.setEmissionFactor(factor);
        entry.setQuantity(quantity);
        entry.setCalculatedTco2e(quantity.multiply(factor.getFactorValue()).divide(KG_PER_TONNE, 4, RoundingMode.HALF_UP));

        return EmissionActivityEntryResponse.from(entryRepository.save(entry));
    }

    @Transactional
    public void deleteEntry(UUID id) {
        UUID companyId = currentUserProvider.requireCompanyId();
        EmissionActivityEntry entry = entryRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new NotFoundException("Activity entry not found"));
        requireYearOpen(entry.getFiscalYear());
        entryRepository.delete(entry);
    }

    @Transactional
    public com.wesee.esg.climate.dto.EmissionsResponse applyToScope(int fiscalYear, EmissionScope scope) {
        if (scope != EmissionScope.SCOPE_1 && scope != EmissionScope.SCOPE_2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only Scope 1 or Scope 2 totals can be applied directly — Scope 3 has multiple categories, apply manually.");
        }

        UUID companyId = currentUserProvider.requireCompanyId();
        BigDecimal sum = entryRepository.findByCompanyIdAndFiscalYearOrderByCreatedAtAscIdAsc(companyId, fiscalYear).stream()
                .filter(e -> e.getEmissionFactor().getScope() == scope)
                .map(EmissionActivityEntry::getCalculatedTco2e)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return emissionsService.setScopeValue(scope, fiscalYear, new SetEmissionValueRequest(sum));
    }

    /**
     * A signed-off year's activity ledger is closed, the same way
     * {@link com.wesee.esg.extraction.ExtractionReviewService} already refuses to commit into one.
     *
     * <p>This matters most to supply chain sharing: a published disclosure carries the signer's
     * name, their date and their SHA-256 beside totals summed live from this table. Without this
     * guard a supplier could sign a year off, then add or delete activity, then publish — and the
     * buyer would see "Signed by Jane Lim" over numbers Jane never signed, with the hash still
     * verifying because it covers the indicator values rather than these rows.
     */
    private void requireYearOpen(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Set<Integer> signedYears = signOffRepository.findByCompanyIdOrderByFiscalYearDesc(companyId).stream()
                .filter(r -> r.getStatus() == SignOffStatus.SIGNED)
                .map(SignOffRecord::getFiscalYear)
                .collect(java.util.stream.Collectors.toSet());
        if (SignOffGuard.isYearLocked(fiscalYear, signedYears)) {
            throw new ConflictException("FY" + fiscalYear + " has been signed off — revoke the"
                    + " sign-off before changing the emissions behind it");
        }
    }

}
