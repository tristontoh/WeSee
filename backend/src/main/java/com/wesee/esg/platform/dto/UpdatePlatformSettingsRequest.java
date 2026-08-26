package com.wesee.esg.platform.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdatePlatformSettingsRequest(
        String smtpHost,
        @NotNull @Min(1) @Max(65535) Integer smtpPort,
        String smtpUsername,
        /** Blank/omitted keeps the existing stored password. */
        String password,
        String fromAddress,
        @NotNull Boolean enabled,
        String appBaseUrl,
        String platformName,
        String supportEmail,
        @NotNull Boolean require2fa,
        String stripePublishableKey,
        /** Blank/omitted keeps the existing stored secret key. */
        String stripeSecretKey,
        /** Blank/omitted keeps the existing stored webhook secret. */
        String stripeWebhookSecret,
        @NotNull Boolean stripeEnabled
) {
}
