/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.activitylog;

import com.wesee.esg.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Platform-wide, cross-tenant lifecycle event (signup, plan change, support ticket, export) —
 * feeds the superadmin "Recent Activity" audit trail. company_name is a denormalized snapshot so
 * the log stays readable even if the company is later renamed or deleted.
 */
@Entity
@Table(name = "platform_activity_log")
@Getter
@Setter
@NoArgsConstructor
public class PlatformActivityLog extends BaseEntity {

    @Column(name = "company_id")
    private UUID companyId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private ActivityEventType eventType;

    @Column(nullable = false, length = 500)
    private String description;
}
