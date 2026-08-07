package com.wesee.esg.tenant;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.tenant.dto.PlanPricingResponse;
import com.wesee.esg.tenant.dto.UpdatePlanPricingRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PlanPricingService {

    private final PlanPricingRepository planPricingRepository;

    public PlanPricingService(PlanPricingRepository planPricingRepository) {
        this.planPricingRepository = planPricingRepository;
    }

    @Transactional(readOnly = true)
    public List<PlanPricingResponse> listPricing() {
        return planPricingRepository.findAll().stream().map(PlanPricingResponse::from).toList();
    }

    @Transactional
    public PlanPricingResponse updatePricing(SubscriptionPlan plan, UpdatePlanPricingRequest request) {
        PlanPricing pricing = planPricingRepository.findById(plan)
                .orElseThrow(() -> new NotFoundException("No pricing configured for plan: " + plan));
        pricing.setMonthlyPrice(request.monthlyPrice());
        return PlanPricingResponse.from(planPricingRepository.save(pricing));
    }
}
