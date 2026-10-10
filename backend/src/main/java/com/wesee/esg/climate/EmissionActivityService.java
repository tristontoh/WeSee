/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import com.wesee.esg.assurance.SignOffLock;
import com.wesee.esg.climate.dto.EmissionActivityEntryResponse;
import com.wesee.esg.climate.dto.EmissionFactorResponse;
import com.wesee.esg.climate.dto.SetEmissionValueRequest;
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
import java.util.List;
import java.util.UUID;

@Service
public class EmissionActivityService {

    private final EmissionFactorRepository factorRepository;
    private final EmissionActivityEntryRepository entryRepository;
    private final EmissionsService emissionsService;
    private final CurrentUserProvider currentUserProvider;
    private final SignOffLock signOffLock;
    private final Scope3CategoryRepository scope3CategoryRepository;

    public EmissionActivityService(EmissionFactorRepository factorRepository,
                                    EmissionActivityEntryRepository entryRepository,
                                    EmissionsService emissionsService,
                                    CurrentUserProvider currentUserProvider,
                                  SignOffLock signOffLock,
                                  Scope3CategoryRepository scope3CategoryRepository) {
        this.factorRepository = factorRepository;
        this.entryRepository = entryRepository;
        this.emissionsService = emissionsService;
        this.currentUserProvider = currentUserProvider;
        this.signOffLock = signOffLock;
        this.scope3CategoryRepository = scope3CategoryRepository;
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
        return addEntry(fiscalYear, factorId, quantity, null);
    }

    /**
     * @param scope3CategoryId which of the fifteen Scope 3 categories this belongs to. Required
     *                         when the factor is Scope 3 and meaningless otherwise: without it the
     *                         entry can be stored but never reported, which is what used to happen
     *                         to every business-travel and freight entry anyone recorded.
     */
    @Transactional
    public EmissionActivityEntryResponse addEntry(int fiscalYear, String factorId, BigDecimal quantity,
                                                  UUID scope3CategoryId) {
        requireYearOpen(fiscalYear);
        UUID companyId = currentUserProvider.requireCompanyId();
        EmissionFactor factor = factorRepository.findById(factorId)
                .orElseThrow(() -> new NotFoundException("Unknown emission factor: " + factorId));

        Scope3Category category = null;
        if (factor.getScope() == EmissionScope.SCOPE_3) {
            if (scope3CategoryId == null) {
                throw new ConflictException(factor.getName() + " is a Scope 3 activity — say which"
                        + " category it belongs to, or it cannot be reported anywhere");
            }
            category = scope3CategoryRepository.findByIdAndCompanyId(scope3CategoryId, companyId)
                    .orElseThrow(() -> new NotFoundException("Scope 3 category not found"));
        } else if (scope3CategoryId != null) {
            throw new ConflictException("Only a Scope 3 activity belongs to a category");
        }

        EmissionActivityEntry entry = new EmissionActivityEntry();
        entry.setCompanyId(companyId);
        entry.setFiscalYear(fiscalYear);
        entry.setEmissionFactor(factor);
        entry.setScope3Category(category);
        entry.setQuantity(quantity);
        entry.setCalculatedTco2e(EmissionMath.tco2e(quantity, factor.getFactorValue()));

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
        signOffLock.requireYearOpen(currentUserProvider.requireCompanyId(), fiscalYear,
                "changing the activity behind it");
    }

}
