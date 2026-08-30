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
 */
public enum AggregationRule {
    SUM,
    LATEST,
    AVERAGE,
    COUNT,
    DIRECT_ANNUAL
}
