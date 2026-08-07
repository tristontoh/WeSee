package com.wesee.esg.climate.dto;

import java.math.BigDecimal;

public record EmissionPointDto(int fiscalYear, BigDecimal value) {
}
