/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai.prompt;

import com.wesee.esg.ai.prompt.dto.PromptTemplateResponse;
import com.wesee.esg.ai.prompt.dto.UpdatePromptTemplateRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/company/ai/prompt-templates")
public class PromptTemplateController {

    private final PromptTemplateService service;

    public PromptTemplateController(PromptTemplateService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("@perm.check('prompts.view') or @perm.check('prompts.manage')")
    public List<PromptTemplateResponse> list() {
        return service.listForCompany();
    }

    @PutMapping("/{draftType}")
    @PreAuthorize("@perm.check('prompts.manage')")
    public PromptTemplateResponse update(@PathVariable String draftType, @Valid @RequestBody UpdatePromptTemplateRequest request) {
        return service.upsertOverride(draftType, request);
    }

    @DeleteMapping("/{draftType}/override")
    @PreAuthorize("@perm.check('prompts.manage')")
    public ResponseEntity<PromptTemplateResponse> resetToDefault(@PathVariable String draftType) {
        return ResponseEntity.ok(service.resetToDefault(draftType));
    }
}
