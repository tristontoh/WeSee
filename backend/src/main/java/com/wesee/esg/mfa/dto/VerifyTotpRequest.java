package com.wesee.esg.mfa.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyTotpRequest(@NotBlank String code) {
}
