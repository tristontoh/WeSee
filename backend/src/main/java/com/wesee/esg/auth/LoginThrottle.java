/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.auth;

import com.wesee.esg.common.exceptions.ConflictException;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stops an attacker trying every password against one address.
 *
 * <p>Keyed on the email, not the IP. A password-spraying attacker rotates addresses behind a
 * single IP, and a legitimate office shares one IP between everybody — so locking the IP punishes
 * the wrong people and misses the actual attack. Locking the address protects the account that is
 * being attacked.
 *
 * <p>In memory, per instance. That is honest about what it is: behind several instances an
 * attacker gets {@code MAX_ATTEMPTS} per instance, and a restart clears the counts. It raises the
 * cost of a brute-force attempt by orders of magnitude and does not pretend to be more. A shared
 * store (Redis, or a table) is the next step when there is more than one instance to coordinate.
 */
@Component
public class LoginThrottle {

    static final int MAX_ATTEMPTS = 5;
    static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    /** Failures older than this stop counting, so a slow trickle never accumulates into a lock. */
    static final Duration WINDOW = Duration.ofMinutes(15);

    /** Bounded so a spray across millions of addresses cannot exhaust memory. */
    private static final int MAX_TRACKED_ADDRESSES = 10_000;

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();

    public void requireNotLocked(String email, Instant now) {
        Deque<Instant> recent = failures.get(key(email));
        if (recent == null) {
            return;
        }
        synchronized (recent) {
            prune(recent, now);
            if (recent.size() < MAX_ATTEMPTS) {
                return;
            }
            Instant unlocksAt = recent.peekLast().plus(LOCK_DURATION);
            if (now.isBefore(unlocksAt)) {
                // Ceiling, not +1: with exactly ten minutes left, "11 minutes" is a small lie,
                // and a wait time you overstate is one the user stops believing.
                long seconds = Duration.between(now, unlocksAt).toSeconds();
                long minutes = Math.max(1, (seconds + 59) / 60);
                throw new ConflictException(
                        "Too many failed sign-in attempts. Try again in " + minutes
                                + " minute" + (minutes == 1 ? "" : "s") + ".");
            }
            recent.clear();
        }
    }

    public void recordFailure(String email, Instant now) {
        if (failures.size() >= MAX_TRACKED_ADDRESSES && !failures.containsKey(key(email))) {
            failures.clear();   // crude, bounded, and better than unbounded growth
        }
        Deque<Instant> recent = failures.computeIfAbsent(key(email), k -> new ArrayDeque<>());
        synchronized (recent) {
            prune(recent, now);
            recent.addLast(now);
        }
    }

    public void recordSuccess(String email) {
        failures.remove(key(email));
    }

    private static void prune(Deque<Instant> recent, Instant now) {
        Instant cutoff = now.minus(WINDOW);
        while (!recent.isEmpty() && recent.peekFirst().isBefore(cutoff)) {
            recent.removeFirst();
        }
    }

    private static String key(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
