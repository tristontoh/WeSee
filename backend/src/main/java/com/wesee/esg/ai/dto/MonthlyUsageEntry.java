package com.wesee.esg.ai.dto;

import java.time.Instant;

public record MonthlyUsageEntry(
        Instant month,
        long requestCount,
        long successCount,
        long inputTokens,
        long outputTokens
) {
}
