package com.wesee.esg.climate.dto;

import java.math.BigDecimal;

/**
 * One year's figure for a scope.
 *
 * {@code derived} marks a total rolled up from accepted activity entries rather than typed in. The
 * two must stay distinguishable: a derived figure moves when a bill is accepted, and a reader
 * comparing this against last year's report needs to know which kind they are looking at.
 */
public record EmissionPointDto(int fiscalYear, BigDecimal value, boolean derived) {
}
