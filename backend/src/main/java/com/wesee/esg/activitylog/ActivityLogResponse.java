/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.activitylog;

import java.time.Instant;
import java.util.UUID;

public record ActivityLogResponse(
        UUID id,
        Instant timestamp,
        UUID companyId,
        String companyName,
        ActivityEventType eventType,
        String description
) {
}
