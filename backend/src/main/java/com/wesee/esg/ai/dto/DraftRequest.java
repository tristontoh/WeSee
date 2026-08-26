package com.wesee.esg.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record DraftRequest(
        @NotBlank String draftType,
        @NotNull Map<String, String> context
) {
}
