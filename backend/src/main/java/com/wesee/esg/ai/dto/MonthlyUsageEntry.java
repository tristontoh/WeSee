/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
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
