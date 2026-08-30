/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai.dto;

import java.util.List;

public record UsageSummaryResponse(
        List<MonthlyUsageEntry> months,
        long totalRequests,
        long totalInputTokens,
        long totalOutputTokens
) {
}
