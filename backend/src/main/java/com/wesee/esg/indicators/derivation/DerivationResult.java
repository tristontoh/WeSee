/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.indicators.DerivationState;

import java.math.BigDecimal;
import java.util.List;

/**
 * What a derivation produced: a number and the arithmetic that made it, or a list of what is
 * missing. The explanation is written for an assurer reading the audit trail — "977.35 / 48.0 =
 * 20.36", with both inputs named, not the word "computed".
 */
public record DerivationResult(
        BigDecimal value,
        DerivationState state,
        String explanation,
        List<String> missing
) {

    public static DerivationResult computed(BigDecimal value, String explanation) {
        return new DerivationResult(value, DerivationState.COMPUTED, explanation, List.of());
    }

    public static DerivationResult awaiting(List<String> missing) {
        return new DerivationResult(null, DerivationState.AWAITING_INPUTS, null, List.copyOf(missing));
    }
}
