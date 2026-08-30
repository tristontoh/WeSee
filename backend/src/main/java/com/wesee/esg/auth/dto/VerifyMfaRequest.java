/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyMfaRequest(@NotBlank String mfaToken, @NotBlank String code) {
}
