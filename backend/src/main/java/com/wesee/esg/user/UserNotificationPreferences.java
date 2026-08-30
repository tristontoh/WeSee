/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.user;

import com.wesee.esg.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Per-user email notification preferences, 1:1 with {@link AppUser}, created lazily on first update. */
@Entity
@Table(name = "user_notification_preferences")
@Getter
@Setter
@NoArgsConstructor
public class UserNotificationPreferences extends BaseEntity {

    @Column(name = "user_id", nullable = false, unique = true, updatable = false)
    private UUID userId;

    @Column(name = "report_deadline_reminders", nullable = false)
    private Boolean reportDeadlineReminders = true;

    @Column(name = "team_activity_alerts", nullable = false)
    private Boolean teamActivityAlerts = true;

    @Column(name = "compliance_alerts", nullable = false)
    private Boolean complianceAlerts = true;

    @Column(name = "weekly_digest", nullable = false)
    private Boolean weeklyDigest = false;
}
