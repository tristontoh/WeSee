/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.auth;

import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Locks an account after enough consecutive wrong passwords, and unlocks it again on its own.
 *
 * This exists alongside {@link com.wesee.esg.security.AuthThrottleFilter}, not instead of it. The
 * filter counts requests per address, which stops one host hammering one account and does nothing
 * about a spray that tries one likely password against a thousand accounts from a thousand hosts.
 * Counting per account is what catches that.
 *
 * The counter lives on the row rather than in memory. In memory it would reset on every deploy —
 * and a restart is exactly what an attacker who has hit a lock would wait for.
 *
 * Ten attempts, not three: a lock a person's own typing can trigger is a denial of service against
 * the account owner, and support carries the cost. Fifteen minutes is long enough to make guessing
 * worthless and short enough that nobody files a ticket over it.
 */
@Service
public class LoginAttemptService {

    static final int MAX_ATTEMPTS = 10;
    static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private final AppUserRepository appUserRepository;

    public LoginAttemptService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    /** Seconds left on the lock, or empty when the account is free to try again. */
    public Optional<Long> lockedSecondsRemaining(AppUser user) {
        Instant until = user.getLockedUntil();
        if (until == null || !until.isAfter(Instant.now())) {
            return Optional.empty();
        }
        return Optional.of(Math.max(1, Duration.between(Instant.now(), until).toSeconds()));
    }

    /**
     * Records a wrong password, and locks the account once the run reaches the limit.
     *
     * REQUIRES_NEW because the caller throws immediately afterwards: on the caller's transaction
     * the increment would roll back along with the failed login and the counter would never move.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(UUID userId) {
        appUserRepository.findById(userId).ifPresent(user -> {
            boolean lockHasRunOut = user.getLockedUntil() != null && lockedSecondsRemaining(user).isEmpty();
            // A lock that has run out ends the old run rather than continuing it — otherwise the
            // eleventh attempt ever made would re-lock the account instantly.
            int attempts = lockHasRunOut ? 1 : user.getFailedLoginAttempts() + 1;

            if (attempts >= MAX_ATTEMPTS) {
                user.setFailedLoginAttempts(0);
                user.setLockedUntil(Instant.now().plus(LOCK_DURATION));
            } else {
                user.setFailedLoginAttempts(attempts);
                if (lockHasRunOut) {
                    user.setLockedUntil(null);
                }
            }
            appUserRepository.save(user);
        });
    }

    /** Ends the run. Called on every correct password, including one that then goes on to MFA. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordSuccess(UUID userId) {
        appUserRepository.findById(userId).ifPresent(user -> {
            if (user.getFailedLoginAttempts() == 0 && user.getLockedUntil() == null) {
                return;
            }
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            appUserRepository.save(user);
        });
    }
}
