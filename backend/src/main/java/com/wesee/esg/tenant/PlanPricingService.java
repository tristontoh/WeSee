/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.tenant.dto.PlanPricingResponse;
import com.wesee.esg.tenant.dto.UpdatePlanPricingRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class PlanPricingService {

    private final PlanPricingRepository planPricingRepository;

    public PlanPricingService(PlanPricingRepository planPricingRepository) {
        this.planPricingRepository = planPricingRepository;
    }

    /**
     * Sorted here rather than with an {@code OrderBy} on the query: the plan is the id and is
     * stored as its enum name, so SQL would order it GROWTH, ISSUER_READY, STARTER. Sorting on
     * the enum itself gives the tier order the pricing table is read in. Updating a price
     * rewrites the tuple, so without this the row just edited moves.
     */
    @Transactional(readOnly = true)
    public List<PlanPricingResponse> listPricing() {
        return planPricingRepository.findAll().stream()
                .sorted(Comparator.comparing(PlanPricing::getPlan))
                .map(PlanPricingResponse::from)
                .toList();
    }

    @Transactional
    public PlanPricingResponse updatePricing(SubscriptionPlan plan, UpdatePlanPricingRequest request) {
        PlanPricing pricing = planPricingRepository.findById(plan)
                .orElseThrow(() -> new NotFoundException("No pricing configured for plan: " + plan));
        pricing.setMonthlyPrice(request.monthlyPrice());
        pricing.setAnnualMonthlyPrice(request.annualMonthlyPrice());
        return PlanPricingResponse.from(planPricingRepository.save(pricing));
    }
}
