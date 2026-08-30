/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.materiality;

import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.SubscriptionPlan;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A versioned snapshot (SRS FR-3.4: re-runnable each period, prior versions retained) — its
 * scores and stakeholders are never mutated after creation. The one deliberate exception is
 * {@code status}/{@code validatedBy*}: Bursa Malaysia's guide requires a separate board/management
 * "Validate" step after Identify + Prioritise, so validation is recorded as a follow-up action on
 * the same row rather than by re-running the wizard.
 */
@Entity
@Table(name = "materiality_assessment")
@Getter
@Setter
@NoArgsConstructor
public class MaterialityAssessment extends TenantOwnedEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "assessment_date", nullable = false)
    private LocalDate assessmentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_at_capture", nullable = false, length = 30)
    private SubscriptionPlan planAtCapture;

    @Enumerated(EnumType.STRING)
    @Column(name = "market_at_capture", length = 30)
    private MarketClassification marketAtCapture;

    @Column(name = "created_by_name", length = 200)
    private String createdByName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssessmentStatus status = AssessmentStatus.DRAFT;

    @Column(name = "validated_by_name", length = 200)
    private String validatedByName;

    @Column(name = "validated_at")
    private Instant validatedAt;
}
