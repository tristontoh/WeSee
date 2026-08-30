/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.user.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateNotificationPreferencesRequest(
        @NotNull Boolean reportDeadlineReminders,
        @NotNull Boolean teamActivityAlerts,
        @NotNull Boolean complianceAlerts,
        @NotNull Boolean weeklyDigest
) {
}
