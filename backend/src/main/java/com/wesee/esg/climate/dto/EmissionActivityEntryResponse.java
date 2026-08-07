package com.wesee.esg.climate.dto;

import com.wesee.esg.climate.EmissionActivityEntry;

import java.math.BigDecimal;
import java.util.UUID;

public record EmissionActivityEntryResponse(
        UUID id,
        int fiscalYear,
        String emissionFactorId,
        String emissionFactorName,
        BigDecimal quantity,
        BigDecimal calculatedTco2e
) {
    public static EmissionActivityEntryResponse from(EmissionActivityEntry e) {
        return new EmissionActivityEntryResponse(
                e.getId(), e.getFiscalYear(), e.getEmissionFactor().getId(), e.getEmissionFactor().getName(),
                e.getQuantity(), e.getCalculatedTco2e()
        );
    }
}
