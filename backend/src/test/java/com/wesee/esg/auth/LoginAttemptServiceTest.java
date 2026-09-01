/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.auth;

import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class LoginAttemptServiceTest {

    private final AppUserRepository appUserRepository = Mockito.mock(AppUserRepository.class);
    private final LoginAttemptService service = new LoginAttemptService(appUserRepository);

    private final UUID userId = UUID.randomUUID();

    private AppUser tracked() {
        AppUser user = new AppUser();
        user.setEmail("someone@example.com");
        Mockito.when(appUserRepository.findById(userId)).thenReturn(Optional.of(user));
        Mockito.when(appUserRepository.save(Mockito.any(AppUser.class))).thenAnswer(i -> i.getArgument(0));
        return user;
    }

    @Test
    void anUntouchedAccountIsNotLocked() {
        AppUser user = tracked();

        assertThat(service.lockedSecondsRemaining(user)).isEmpty();
    }

    @Test
    void theRunHasToReachTheLimitBeforeAnythingLocks() {
        AppUser user = tracked();

        for (int i = 0; i < LoginAttemptService.MAX_ATTEMPTS - 1; i++) {
            service.recordFailure(userId);
        }

        assertThat(user.getFailedLoginAttempts()).isEqualTo(LoginAttemptService.MAX_ATTEMPTS - 1);
        assertThat(user.getLockedUntil()).isNull();
        assertThat(service.lockedSecondsRemaining(user)).isEmpty();
    }

    @Test
    void theLimitingAttemptLocksTheAccount() {
        AppUser user = tracked();

        for (int i = 0; i < LoginAttemptService.MAX_ATTEMPTS; i++) {
            service.recordFailure(userId);
        }

        assertThat(user.getLockedUntil()).isNotNull();
        assertThat(service.lockedSecondsRemaining(user)).isPresent();
        // Counter goes back to zero: the lock is now what holds the account, not the tally.
        assertThat(user.getFailedLoginAttempts()).isZero();
    }

    @Test
    void aLockThatHasRunOutStartsAFreshRunRatherThanRelockingOnTheNextAttempt() {
        AppUser user = tracked();
        user.setLockedUntil(Instant.now().minus(1, ChronoUnit.MINUTES));

        service.recordFailure(userId);

        assertThat(user.getLockedUntil()).isNull();
        assertThat(user.getFailedLoginAttempts()).isEqualTo(1);
    }

    @Test
    void aCorrectPasswordEndsTheRun() {
        AppUser user = tracked();
        service.recordFailure(userId);
        service.recordFailure(userId);

        service.recordSuccess(userId);

        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLockedUntil()).isNull();
    }

    @Test
    void successOnAnUntouchedAccountDoesNotWrite() {
        tracked();

        service.recordSuccess(userId);

        Mockito.verify(appUserRepository, Mockito.never()).save(Mockito.any(AppUser.class));
    }
}
