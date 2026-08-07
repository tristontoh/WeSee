package com.wesee.esg.climate;

import com.wesee.esg.climate.dto.EmissionActivityEntryResponse;
import com.wesee.esg.climate.dto.EmissionFactorResponse;
import com.wesee.esg.climate.dto.SetEmissionValueRequest;
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

    public EmissionActivityService(EmissionFactorRepository factorRepository,
                                    EmissionActivityEntryRepository entryRepository,
                                    EmissionsService emissionsService,
                                    CurrentUserProvider currentUserProvider) {
        this.factorRepository = factorRepository;
        this.entryRepository = entryRepository;
        this.emissionsService = emissionsService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public List<EmissionFactorResponse> listFactors() {
        return factorRepository.findAll().stream().map(EmissionFactorResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<EmissionActivityEntryResponse> listEntries(int fiscalYear) {
        return entryRepository.findByCompanyIdAndFiscalYear(currentUserProvider.requireCompanyId(), fiscalYear).stream()
                .map(EmissionActivityEntryResponse::from)
                .toList();
    }

    @Transactional
    public EmissionActivityEntryResponse addEntry(int fiscalYear, String factorId, BigDecimal quantity) {
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
        entryRepository.delete(entry);
    }

    @Transactional
    public com.wesee.esg.climate.dto.EmissionsResponse applyToScope(int fiscalYear, EmissionScope scope) {
        if (scope != EmissionScope.SCOPE_1 && scope != EmissionScope.SCOPE_2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only Scope 1 or Scope 2 totals can be applied directly — Scope 3 has multiple categories, apply manually.");
        }

        UUID companyId = currentUserProvider.requireCompanyId();
        BigDecimal sum = entryRepository.findByCompanyIdAndFiscalYear(companyId, fiscalYear).stream()
                .filter(e -> e.getEmissionFactor().getScope() == scope)
                .map(EmissionActivityEntry::getCalculatedTco2e)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return emissionsService.setScopeValue(scope, fiscalYear, new SetEmissionValueRequest(sum));
    }
}
