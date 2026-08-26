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
