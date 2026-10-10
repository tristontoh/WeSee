/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.assurance.SignOffRecord;
import com.wesee.esg.assurance.SignOffStatus;
import com.wesee.esg.common.exceptions.ConflictException;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PublishGuardTest {

    private static SignOffRecord signOff(SignOffStatus status) {
        SignOffRecord r = new SignOffRecord();
        r.setFiscalYear(2025);
        r.setStatus(status);
        r.setHash("a".repeat(64));
        r.setSignerName("Jane Lim");
        r.setSignedAt(Instant.parse("2026-01-15T00:00:00Z"));
        return r;
    }

    @Test
    void aSignedYearMayBePublished() {
        assertDoesNotThrow(() -> PublishGuard.requirePublishable(signOff(SignOffStatus.SIGNED), 2025));
    }

    @Test
    void anUnsignedYearHasNothingToAttestAndIsRefused() {
        ConflictException e = assertThrows(ConflictException.class,
                () -> PublishGuard.requirePublishable(null, 2025));
        assertTrue(e.getMessage().toLowerCase().contains("sign"), e.getMessage());
        assertTrue(e.getMessage().contains("2025"), e.getMessage());
    }

    @Test
    void aRevokedSignOffIsRefused() {
        ConflictException e = assertThrows(ConflictException.class,
                () -> PublishGuard.requirePublishable(signOff(SignOffStatus.REVOKED), 2025));
        assertTrue(e.getMessage().toLowerCase().contains("revok"), e.getMessage());
    }

    @Test
    void aSignOffWithoutAHashIsRefusedBecauseThereIsNothingToAttestWith() {
        SignOffRecord r = signOff(SignOffStatus.SIGNED);
        r.setHash(null);
        ConflictException e = assertThrows(ConflictException.class,
                () -> PublishGuard.requirePublishable(r, 2025));
        assertTrue(e.getMessage().toLowerCase().contains("hash"), e.getMessage());
    }

    @Test
    void aSignOffWithABlankHashIsAlsoRefused() {
        SignOffRecord r = signOff(SignOffStatus.SIGNED);
        r.setHash("   ");
        assertThrows(ConflictException.class, () -> PublishGuard.requirePublishable(r, 2025));
    }

    @Test
    void theRefusalNamesTheYearTheCallerAskedFor() {
        ConflictException e = assertThrows(ConflictException.class,
                () -> PublishGuard.requirePublishable(null, 2024));
        assertTrue(e.getMessage().contains("2024"), e.getMessage());
    }
}
