/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.auth;

import com.wesee.esg.common.exceptions.ConflictException;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Nothing stopped an attacker trying every password against an email address. This does.
 *
 * <p>Keyed on the email rather than the IP: a password-spraying attacker rotates addresses behind
 * one IP, and a legitimate office shares one IP between everybody. Locking the address is the one
 * that protects the account being attacked.
 */
class LoginThrottleTest {

    private static final Instant T0 = Instant.parse("2026-10-10T12:00:00Z");

    private LoginThrottle throttle() {
        return new LoginThrottle();
    }

    @Test
    void anOrdinaryFailureDoesNotLockAnyone() {
        LoginThrottle t = throttle();
        t.recordFailure("a@b.my", T0);
        assertDoesNotThrow(() -> t.requireNotLocked("a@b.my", T0));
    }

    @Test
    void theFifthFailureLocksTheAddress() {
        LoginThrottle t = throttle();
        for (int i = 0; i < LoginThrottle.MAX_ATTEMPTS; i++) {
            t.recordFailure("a@b.my", T0);
        }
        ConflictException e = assertThrows(ConflictException.class,
                () -> t.requireNotLocked("a@b.my", T0));
        assertTrue(e.getMessage().toLowerCase().contains("too many"), e.getMessage());
    }

    @Test
    void oneAddressLockingDoesNotLockAnother() {
        LoginThrottle t = throttle();
        for (int i = 0; i < LoginThrottle.MAX_ATTEMPTS; i++) {
            t.recordFailure("victim@b.my", T0);
        }
        assertThrows(ConflictException.class, () -> t.requireNotLocked("victim@b.my", T0));
        assertDoesNotThrow(() -> t.requireNotLocked("someone.else@b.my", T0));
    }

    @Test
    void theLockExpires() {
        LoginThrottle t = throttle();
        for (int i = 0; i < LoginThrottle.MAX_ATTEMPTS; i++) {
            t.recordFailure("a@b.my", T0);
        }
        Instant after = T0.plus(LoginThrottle.LOCK_DURATION).plusSeconds(1);
        assertDoesNotThrow(() -> t.requireNotLocked("a@b.my", after));
    }

    @Test
    void aSuccessfulLoginClearsTheCount() {
        LoginThrottle t = throttle();
        for (int i = 0; i < LoginThrottle.MAX_ATTEMPTS - 1; i++) {
            t.recordFailure("a@b.my", T0);
        }
        t.recordSuccess("a@b.my");
        t.recordFailure("a@b.my", T0);
        assertDoesNotThrow(() -> t.requireNotLocked("a@b.my", T0));
    }

    /** Case must not be a way around it — the address lookup itself ignores case. */
    @Test
    void theLockIgnoresCase() {
        LoginThrottle t = throttle();
        for (int i = 0; i < LoginThrottle.MAX_ATTEMPTS; i++) {
            t.recordFailure("A@B.MY", T0);
        }
        assertThrows(ConflictException.class, () -> t.requireNotLocked("a@b.my", T0));
    }

    /** Old failures age out, so a slow trickle never accumulates into a lock. */
    @Test
    void failuresOlderThanTheWindowDoNotCount() {
        LoginThrottle t = throttle();
        for (int i = 0; i < LoginThrottle.MAX_ATTEMPTS - 1; i++) {
            t.recordFailure("a@b.my", T0);
        }
        Instant muchLater = T0.plus(LoginThrottle.WINDOW).plusSeconds(1);
        t.recordFailure("a@b.my", muchLater);
        assertDoesNotThrow(() -> t.requireNotLocked("a@b.my", muchLater));
    }

    @Test
    void theRefusalSaysHowLongToWait() {
        LoginThrottle t = throttle();
        for (int i = 0; i < LoginThrottle.MAX_ATTEMPTS; i++) {
            t.recordFailure("a@b.my", T0);
        }
        ConflictException e = assertThrows(ConflictException.class,
                () -> t.requireNotLocked("a@b.my", T0.plus(Duration.ofMinutes(5))));
        assertTrue(e.getMessage().contains("10"), e.getMessage());
    }

    @Test
    void theDefaultsAreTheOnesTheRefusalPromises() {
        assertEquals(5, LoginThrottle.MAX_ATTEMPTS);
        assertEquals(Duration.ofMinutes(15), LoginThrottle.LOCK_DURATION);
    }
}
