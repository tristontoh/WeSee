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
