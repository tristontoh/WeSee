/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai;

import com.wesee.esg.ai.dto.UsageSummaryResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/company/ai/usage")
public class AiUsageController {

    private final AiUsageService service;

    public AiUsageController(AiUsageService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("@perm.check('ai.view') or @perm.check('ai.manage')")
    public UsageSummaryResponse get(@RequestParam(defaultValue = "6") int months) {
        return service.getUsage(months);
    }
}
