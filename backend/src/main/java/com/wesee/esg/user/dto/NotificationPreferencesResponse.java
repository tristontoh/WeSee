package com.wesee.esg.user.dto;

import com.wesee.esg.user.UserNotificationPreferences;

import java.time.Instant;

public record NotificationPreferencesResponse(
        boolean reportDeadlineReminders,
        boolean teamActivityAlerts,
        boolean complianceAlerts,
        boolean weeklyDigest,
        Instant updatedAt
) {
    public static NotificationPreferencesResponse from(UserNotificationPreferences prefs) {
        if (prefs == null) {
            return new NotificationPreferencesResponse(true, true, true, false, null);
        }
        return new NotificationPreferencesResponse(
                Boolean.TRUE.equals(prefs.getReportDeadlineReminders()),
                Boolean.TRUE.equals(prefs.getTeamActivityAlerts()),
                Boolean.TRUE.equals(prefs.getComplianceAlerts()),
                Boolean.TRUE.equals(prefs.getWeeklyDigest()),
                prefs.getUpdatedAt()
        );
    }
}
