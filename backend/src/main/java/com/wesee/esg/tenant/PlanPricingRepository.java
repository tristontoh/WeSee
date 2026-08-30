/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanPricingRepository extends JpaRepository<PlanPricing, SubscriptionPlan> {
}
