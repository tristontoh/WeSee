package com.wesee.esg.ai.prompt.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdatePromptTemplateRequest(
        @NotBlank String systemPrompt,
        @NotBlank String userPromptTemplate
) {
}
