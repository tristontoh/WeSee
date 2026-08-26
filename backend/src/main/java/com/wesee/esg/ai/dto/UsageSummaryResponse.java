package com.wesee.esg.ai.dto;

import java.util.List;

public record UsageSummaryResponse(
        List<MonthlyUsageEntry> months,
        long totalRequests,
        long totalInputTokens,
        long totalOutputTokens
) {
}
