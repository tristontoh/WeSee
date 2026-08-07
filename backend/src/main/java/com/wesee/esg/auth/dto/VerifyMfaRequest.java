package com.wesee.esg.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyMfaRequest(@NotBlank String mfaToken, @NotBlank String code) {
}
