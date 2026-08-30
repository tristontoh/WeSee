/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.reference;

import com.wesee.esg.tenant.SubscriptionPlan;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DB-backed mirror of the frontend's {@code PlanContext.FEATURE_REGISTRY} — the server-side
 * source of truth for plan-gating, so tier/feature changes don't require a redeploy.
 */
@Entity
@Table(name = "feature_flag")
@Getter
@Setter
@NoArgsConstructor
public class FeatureFlag {

    @Id
    @Column(name = "feature_key", length = 50)
    private String featureKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "min_plan", nullable = false, length = 30)
    private SubscriptionPlan minPlan;

    @Column(name = "visible_only_at_min_plan", nullable = false)
    private Boolean visibleOnlyAtMinPlan = false;
}
