/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant;

import com.wesee.esg.tenant.dto.PlanPricingResponse;
import com.wesee.esg.tenant.dto.UpdatePlanPricingRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Platform-admin management of per-plan monthly pricing (Plan Management module). */
@RestController
@RequestMapping("/api/v1/admin/plan-pricing")
@PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'SUPERADMIN')")
public class PlanPricingController {

    private final PlanPricingService planPricingService;

    public PlanPricingController(PlanPricingService planPricingService) {
        this.planPricingService = planPricingService;
    }

    @GetMapping
    public List<PlanPricingResponse> list() {
        return planPricingService.listPricing();
    }

    @PatchMapping("/{plan}")
    public PlanPricingResponse update(@PathVariable SubscriptionPlan plan, @Valid @RequestBody UpdatePlanPricingRequest request) {
        return planPricingService.updatePricing(plan, request);
    }
}
