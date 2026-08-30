/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai.prompt.dto;

public record PromptTemplateResponse(
        String draftType,
        String label,
        String description,
        String systemPrompt,
        String userPromptTemplate,
        boolean isCustomized
) {
}
