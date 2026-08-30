/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

public record AskRequest(
        @NotBlank String question,
        /** Optional — e.g. the matter/indicator currently in view, so the assistant can ground its answer in it. */
        Map<String, String> context
) {
}
