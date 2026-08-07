package com.wesee.esg.platform.dto;

import com.wesee.esg.platform.PlatformSettings;

import java.time.Instant;

public record PlatformSettingsResponse(
        boolean configured,
        String smtpHost,
        Integer smtpPort,
        String smtpUsername,
        String fromAddress,
        boolean enabled,
        boolean passwordSet,
        String appBaseUrl,
        String platformName,
        String supportEmail,
        boolean require2fa,
        long sessionExpirationMinutes,
        Instant lastTestAt,
        Boolean lastTestSuccess,
        String lastTestMessage
) {
    public static PlatformSettingsResponse from(PlatformSettings s, long sessionExpirationMinutes) {
        return new PlatformSettingsResponse(
                true, s.getSmtpHost(), s.getSmtpPort(), s.getSmtpUsername(), s.getFromAddress(),
                Boolean.TRUE.equals(s.getEnabled()), s.getSmtpPasswordEncrypted() != null,
                s.getAppBaseUrl(), s.getPlatformName(), s.getSupportEmail(), Boolean.TRUE.equals(s.getRequire2fa()),
                sessionExpirationMinutes, s.getLastTestAt(), s.getLastTestSuccess(), s.getLastTestMessage()
        );
    }

    public static PlatformSettingsResponse notConfigured(long sessionExpirationMinutes) {
        return new PlatformSettingsResponse(false, null, 587, null, null, false, false, null, null, null, false,
                sessionExpirationMinutes, null, null, null);
    }
}
