package com.wesee.esg.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AcceptInviteRequest(
        @NotBlank String name,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") String password
) {
}
