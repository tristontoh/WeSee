/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai;

import com.wesee.esg.ai.dto.AskRequest;
import com.wesee.esg.ai.dto.AskResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/company/ai/ask")
public class AiQaController {

    private final AiQaService service;

    public AiQaController(AiQaService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("@perm.check('ai.use')")
    public AskResponse ask(@Valid @RequestBody AskRequest request) {
        return service.ask(request);
    }
}
