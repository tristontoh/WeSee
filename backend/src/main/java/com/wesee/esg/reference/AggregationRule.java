/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.reference;

/**
 * How an indicator's disclosure-facing annual {@code IndicatorValue} is derived from its monthly
 * entries: SUM/COUNT for flow and event metrics (energy, emissions, waste, incidents), LATEST for
 * point-in-time snapshots (headcount, board composition), AVERAGE for rate metrics. DIRECT_ANNUAL
 * indicators have no natural monthly data and are entered directly as an annual figure instead.
 *
 * <p>DERIVED indicators are computed from other indicators and from the per-fiscal-year figures in
 * {@code company_annual_figure}, by the named function their {@code derivation_key} points at. They
 * are never entered by hand — {@link com.wesee.esg.indicators.IndicatorService#setValue} refuses a
 * manual write to any rule but DIRECT_ANNUAL, and that refusal is what makes a ratio trustworthy.
 */
public enum AggregationRule {
    SUM,
    LATEST,
    AVERAGE,
    COUNT,
    DIRECT_ANNUAL,
    DERIVED;

    /**
     * Whether a person may write this indicator's value at all. Every write door asks this one
     * question: {@code IndicatorService.setValue}, {@code setMonthlyValue}, and the extraction
     * review path. Guarding only one of them is how a ratio becomes a 500 instead of a 409.
     */
    public boolean isHandEntered() {
        return this != DERIVED;
    }
}
