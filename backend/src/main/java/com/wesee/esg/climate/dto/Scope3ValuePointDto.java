package com.wesee.esg.climate.dto;

import java.math.BigDecimal;

public record Scope3ValuePointDto(int fiscalYear, BigDecimal value, boolean transitionRelief) {
}
