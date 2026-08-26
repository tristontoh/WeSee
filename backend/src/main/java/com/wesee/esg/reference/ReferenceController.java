package com.wesee.esg.reference;

import com.wesee.esg.permission.dto.PermissionResponse;
import com.wesee.esg.reference.dto.FeatureFlagResponse;
import com.wesee.esg.reference.dto.IndicatorDefinitionResponse;
import com.wesee.esg.reference.dto.MatterResponse;
import com.wesee.esg.reference.dto.SectorResponse;
import com.wesee.esg.tenant.dto.PlanPricingResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reference")
public class ReferenceController {

    private final ReferenceService referenceService;

    public ReferenceController(ReferenceService referenceService) {
        this.referenceService = referenceService;
    }

    @GetMapping("/sectors")
    public List<SectorResponse> sectors() {
        return referenceService.listSectors();
    }

    @GetMapping("/matters")
    public List<MatterResponse> matters(@RequestParam(required = false) MatterSet set) {
        return referenceService.listMatters(set);
    }

    @GetMapping("/matters/applicable")
    public List<MatterResponse> applicableMatters() {
        return referenceService.listApplicableMatters();
    }

    @GetMapping("/indicators")
    public List<IndicatorDefinitionResponse> indicators(@RequestParam(required = false) String matterId) {
        return referenceService.listIndicators(matterId);
    }

    @GetMapping("/indicators/applicable")
    public List<IndicatorDefinitionResponse> applicableIndicators() {
        return referenceService.listApplicableIndicators();
    }

    @GetMapping("/feature-flags")
    public List<FeatureFlagResponse> featureFlags() {
        return referenceService.listFeatureFlags();
    }

    @GetMapping("/plan-pricing")
    public List<PlanPricingResponse> planPricing() {
        return referenceService.listPlanPricing();
    }

    /** The full catalog of grantable custom-role permission keys — see V54__permission_catalog.sql. */
    @GetMapping("/permissions")
    public List<PermissionResponse> permissions() {
        return referenceService.listPermissions();
    }

}
