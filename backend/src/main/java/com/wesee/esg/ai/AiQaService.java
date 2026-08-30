/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai;

import com.wesee.esg.ai.dto.AskRequest;
import com.wesee.esg.ai.dto.AskResponse;
import org.springframework.stereotype.Service;

import java.util.Map;

/** The "Ask AI" assistant — reuses AiDraftService's resolve/fill/call/log pipeline against the seeded qa-assistant template. */
@Service
public class AiQaService {

    private static final String DRAFT_TYPE = "qa-assistant";

    private final AiDraftService aiDraftService;

    public AiQaService(AiDraftService aiDraftService) {
        this.aiDraftService = aiDraftService;
    }

    public AskResponse ask(AskRequest request) {
        boolean grounded = request.context() != null && !request.context().isEmpty();
        String contextBlock = grounded ? formatContextBlock(request.context()) : "No specific matter or indicator is in view — answer from general knowledge.";

        String answer = aiDraftService.complete("qa", DRAFT_TYPE, Map.of("question", request.question(), "contextBlock", contextBlock));
        return new AskResponse(answer, grounded);
    }

    private String formatContextBlock(Map<String, String> context) {
        StringBuilder sb = new StringBuilder("Context:\n");
        context.forEach((key, value) -> sb.append("- ").append(key).append(": ").append(value).append('\n'));
        return sb.toString();
    }
}
