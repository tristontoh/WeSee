package com.wesee.esg.email.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateEmailSettingsRequest(
        @NotBlank String smtpHost,
        @NotNull @Min(1) @Max(65535) Integer smtpPort,
        @NotBlank String smtpUsername,
        /** Blank/omitted keeps the existing stored password (e.g. when only changing the host or from-address). */
        String password,
        @NotBlank @Email String fromAddress,
        @NotNull Boolean enabled
) {
}
