/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.assurance.dto;

import com.wesee.esg.assurance.AssuranceLevel;
import com.wesee.esg.assurance.SignOffRecord;
import com.wesee.esg.assurance.SignOffStatus;

import java.time.Instant;
import java.time.LocalDate;

public record SignOffResponse(
        int fiscalYear,
        SignOffStatus status,
        String signerName,
        String signerTitle,
        String notes,
        String hash,
        Instant signedAt,
        Instant revokedAt,
        String revokedBy,
        String revocationReason,
        AssuranceLevel assuranceLevel,
        String externalAssurerName,
        String standardReferenced,
        LocalDate nextExternalAssuranceDeadline
) {
    public static SignOffResponse from(SignOffRecord r, LocalDate nextExternalAssuranceDeadline) {
        return new SignOffResponse(r.getFiscalYear(), r.getStatus(), r.getSignerName(), r.getSignerTitle(),
                r.getNotes(), r.getHash(), r.getSignedAt(), r.getRevokedAt(), r.getRevokedBy(), r.getRevocationReason(),
                r.getAssuranceLevel(), r.getExternalAssurerName(), r.getStandardReferenced(), nextExternalAssuranceDeadline);
    }
}
