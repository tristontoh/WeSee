/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.apiaccess;

import com.wesee.esg.indicators.IndicatorService;
import com.wesee.esg.indicators.dto.IndicatorResponse;
import com.wesee.esg.indicators.dto.SetIndicatorValueRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Scoped external API surface for programmatic integrations (see ApiTokenController for token
 * issuance). Thin wrapper reusing IndicatorService unchanged — same business logic and audit
 * trail as the browser-facing /api/v1/indicators endpoints.
 */
@RestController
@RequestMapping("/api/external/v1/indicators")
public class ExternalIndicatorController {

    private final IndicatorService indicatorService;

    public ExternalIndicatorController(IndicatorService indicatorService) {
        this.indicatorService = indicatorService;
    }

    @GetMapping
    @PreAuthorize("@apiScope.check('INDICATORS_READ')")
    public List<IndicatorResponse> list() {
        return indicatorService.listIndicators();
    }

    @PostMapping("/{indicatorId}/values/{fiscalYear}")
    @PreAuthorize("@apiScope.check('INDICATORS_WRITE')")
    public IndicatorResponse setValue(@PathVariable String indicatorId,
                                       @PathVariable int fiscalYear,
                                       @Valid @RequestBody SetIndicatorValueRequest request) {
        return indicatorService.setValue(indicatorId, fiscalYear, request);
    }
}
