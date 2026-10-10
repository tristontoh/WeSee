/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.assurance;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Which fiscal years a sign-off closes to further change.
 *
 * <p>Three services asked this question and two of them built the answer differently, which is the
 * reason it now lives in one place. The difference was not cosmetic: one filtered on
 * {@code status == SIGNED} and one did not, so a year that had been signed and then revoked stayed
 * locked forever in the extraction review screen — and the error message that screen showed told
 * the user to revoke the sign-off, which is exactly what they had already done.
 */
class SignOffLockTest {

    @Test
    void aSignedYearIsLocked() {
        Set<Integer> locked = SignOffLock.lockedYears(List.of(record(2024, SignOffStatus.SIGNED)));
        assertEquals(Set.of(2024), locked);
    }

    /** The defect. Revoking is the documented way to reopen a year; it has to actually reopen it. */
    @Test
    void aRevokedYearIsOpenAgain() {
        Set<Integer> locked = SignOffLock.lockedYears(List.of(record(2024, SignOffStatus.REVOKED)));
        assertTrue(locked.isEmpty(),
                "a revoked sign-off must not keep the year closed — revoking is the recovery path");
    }

    @Test
    void onlyTheSignedYearsOfAMixedHistoryAreLocked() {
        Set<Integer> locked = SignOffLock.lockedYears(List.of(
                record(2022, SignOffStatus.SIGNED),
                record(2023, SignOffStatus.REVOKED),
                record(2024, SignOffStatus.SIGNED)));
        assertEquals(Set.of(2022, 2024), locked);
    }

    @Test
    void noRecordsLocksNothing() {
        assertTrue(SignOffLock.lockedYears(List.of()).isEmpty());
    }

    /** A record with no year cannot lock one, and must not blow up the lookup either. */
    @Test
    void aRecordWithNoFiscalYearIsIgnored() {
        Set<Integer> locked = SignOffLock.lockedYears(List.of(
                record(null, SignOffStatus.SIGNED),
                record(2024, SignOffStatus.SIGNED)));
        assertEquals(Set.of(2024), locked);
    }

    @Test
    void theLockedSetAnswersTheQuestionCallersActuallyAsk() {
        Set<Integer> locked = SignOffLock.lockedYears(List.of(record(2024, SignOffStatus.SIGNED)));
        assertTrue(locked.contains(2024));
        assertFalse(locked.contains(2025));
    }

    private static SignOffRecord record(Integer fiscalYear, SignOffStatus status) {
        SignOffRecord r = new SignOffRecord();
        r.setFiscalYear(fiscalYear);
        r.setStatus(status);
        return r;
    }
}
