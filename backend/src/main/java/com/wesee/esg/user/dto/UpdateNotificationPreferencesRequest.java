package com.wesee.esg.user.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateNotificationPreferencesRequest(
        @NotNull Boolean reportDeadlineReminders,
        @NotNull Boolean teamActivityAlerts,
        @NotNull Boolean complianceAlerts,
        @NotNull Boolean weeklyDigest
) {
}
