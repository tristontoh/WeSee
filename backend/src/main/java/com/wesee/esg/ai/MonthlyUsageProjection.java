/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai;

import java.time.Instant;

/** Spring Data native-query projection for the monthly usage rollup — see AiUsageLogRepository. */
public interface MonthlyUsageProjection {
    Instant getMonth();
    Long getRequestCount();
    Long getSuccessCount();
    Long getInputTokens();
    Long getOutputTokens();
}
