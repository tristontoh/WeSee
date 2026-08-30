/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.assurance.dto;

import com.wesee.esg.assurance.SignOffAuditEntry;
import com.wesee.esg.assurance.SignOffStatus;

import java.time.Instant;

public record SignOffAuditEntryResponse(
        SignOffStatus action,
        String actorName,
        String actorTitle,
        String notes,
        String hash,
        Instant timestamp
) {
    public static SignOffAuditEntryResponse from(SignOffAuditEntry e) {
        return new SignOffAuditEntryResponse(e.getAction(), e.getActorName(), e.getActorTitle(), e.getNotes(), e.getHash(), e.getCreatedAt());
    }
}
