package com.wesee.esg.apiaccess.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateApiTokenRequest(
        @NotBlank String name,
        @NotEmpty List<String> scopes,
        Integer expiresInDays
) {
}
