package com.wesee.esg.reference;

import com.wesee.esg.tenant.dto.PlanPricingResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The one route the marketing site may call without a token.
 *
 * Plan prices are admin-managed (Platform Admin → Plan Management, see V15/V49/V69), but the
 * pricing page is read by people who have no account, so it cannot use
 * {@link ReferenceController}'s authenticated equivalent — that answers 403 signed out. Without
 * this the page fell back to hardcoded numbers and drifted from what an admin had set: the
 * signed-in billing view read the real figure while a visitor was quoted a different one.
 *
 * Deliberately narrow. Everything else under /api/v1/reference stays authenticated, and this
 * carries only what is already published on a public page — no per-company data passes through it.
 */
@Tag(name = "Public reference")
@RestController
@RequestMapping("/api/v1/public")
public class PublicReferenceController {

    private final ReferenceService referenceService;

    public PublicReferenceController(ReferenceService referenceService) {
        this.referenceService = referenceService;
    }

    @GetMapping("/plan-pricing")
    public List<PlanPricingResponse> planPricing() {
        return referenceService.listPlanPricing();
    }
}
