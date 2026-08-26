package com.wesee.esg.indicators;

import com.wesee.esg.indicators.dto.IndicatorResponse;
import com.wesee.esg.indicators.dto.SetIndicatorTargetRequest;
import com.wesee.esg.indicators.dto.SetIndicatorValueRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/indicators")
@Validated
public class IndicatorController {

    private final IndicatorService indicatorService;

    public IndicatorController(IndicatorService indicatorService) {
        this.indicatorService = indicatorService;
    }

    @GetMapping
    public List<IndicatorResponse> list() {
        return indicatorService.listIndicators();
    }

    @GetMapping("/{indicatorId}")
    public IndicatorResponse get(@PathVariable String indicatorId) {
        return indicatorService.getIndicator(indicatorId);
    }

    @PatchMapping("/{indicatorId}/values/{fiscalYear}")
    public IndicatorResponse setValue(@PathVariable String indicatorId,
                                       @PathVariable int fiscalYear,
                                       @Valid @RequestBody SetIndicatorValueRequest request) {
        return indicatorService.setValue(indicatorId, fiscalYear, request);
    }

    @PatchMapping("/{indicatorId}/monthly/{fiscalYear}/{month}")
    public IndicatorResponse setMonthlyValue(@PathVariable String indicatorId,
                                              @PathVariable int fiscalYear,
                                              @PathVariable @Min(1) @Max(12) int month,
                                              @Valid @RequestBody SetIndicatorValueRequest request) {
        return indicatorService.setMonthlyValue(indicatorId, fiscalYear, month, request);
    }

    @PatchMapping("/{indicatorId}/target")
    public IndicatorResponse setTarget(@PathVariable String indicatorId,
                                        @Valid @RequestBody SetIndicatorTargetRequest request) {
        return indicatorService.setTarget(indicatorId, request);
    }

    /** Board/management sign-off on a reported figure (Bursa's Identify → Prioritise → Validate process, applied to data). */
    @PatchMapping("/{indicatorId}/values/{fiscalYear}/approve")
    @PreAuthorize("@perm.check('indicators.approve')")
    public IndicatorResponse approveValue(@PathVariable String indicatorId, @PathVariable int fiscalYear) {
        return indicatorService.approveValue(indicatorId, fiscalYear);
    }
}
