package com.wesee.esg.climate.dto;

import com.wesee.esg.climate.EmissionFactor;
import com.wesee.esg.climate.EmissionScope;

import java.math.BigDecimal;

public record EmissionFactorResponse(
        String id,
        String name,
        EmissionScope scope,
        String activityUnit,
        BigDecimal factorValue,
        String source,
        int sourceYear
) {
    public static EmissionFactorResponse from(EmissionFactor f) {
        return new EmissionFactorResponse(f.getId(), f.getName(), f.getScope(), f.getActivityUnit(), f.getFactorValue(), f.getSource(), f.getSourceYear());
    }
}
