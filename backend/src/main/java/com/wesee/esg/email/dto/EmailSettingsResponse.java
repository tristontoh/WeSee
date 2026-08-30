/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.email.dto;

import com.wesee.esg.email.CompanyEmailSettings;

import java.time.Instant;

public record EmailSettingsResponse(
        boolean configured,
        String smtpHost,
        Integer smtpPort,
        String smtpUsername,
        String fromAddress,
        boolean enabled,
        boolean passwordSet,
        Instant lastTestAt,
        Boolean lastTestSuccess,
        String lastTestMessage
) {
    public static EmailSettingsResponse from(CompanyEmailSettings s) {
        return new EmailSettingsResponse(
                true, s.getSmtpHost(), s.getSmtpPort(), s.getSmtpUsername(), s.getFromAddress(),
                Boolean.TRUE.equals(s.getEnabled()), true, s.getLastTestAt(), s.getLastTestSuccess(), s.getLastTestMessage()
        );
    }

    public static EmailSettingsResponse notConfigured() {
        return new EmailSettingsResponse(false, null, 587, null, null, false, false, null, null, null);
    }
}
