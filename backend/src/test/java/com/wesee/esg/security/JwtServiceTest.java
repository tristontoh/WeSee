/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("test-only-secret-key-1234567890-abcdefghijklmnop");
        properties.setExpirationMinutes(60);
        jwtService = new JwtService(properties);
    }

    @Test
    void jtiRoundTripsThroughGenerateAndParse() {
        AppUser user = testUser();
        UUID jti = UUID.randomUUID();

        String token = jwtService.generateToken(user, jti);
        var decoded = jwtService.parse(token);

        assertTrue(decoded.isPresent());
        assertEquals(jti, decoded.get().jti());
        assertEquals(user.getId(), decoded.get().userId());
        assertEquals(0, decoded.get().tokenVersion());
    }

    @Test
    void mfaChallengeTokenIsRejectedByOrdinarySessionParse() {
        UUID userId = UUID.randomUUID();
        String challengeToken = jwtService.generateMfaChallengeToken(userId);

        assertFalse(jwtService.parse(challengeToken).isPresent());
    }

    @Test
    void ordinarySessionTokenIsRejectedByMfaChallengeParse() {
        AppUser user = testUser();
        String sessionToken = jwtService.generateToken(user, UUID.randomUUID());

        assertFalse(jwtService.parseMfaChallenge(sessionToken).isPresent());
    }

    @Test
    void mfaChallengeTokenRoundTripsToTheOriginalUserId() {
        UUID userId = UUID.randomUUID();
        String challengeToken = jwtService.generateMfaChallengeToken(userId);

        var decoded = jwtService.parseMfaChallenge(challengeToken);

        assertTrue(decoded.isPresent());
        assertEquals(userId, decoded.get());
    }

    @Test
    void garbageTokenIsRejectedRatherThanThrowing() {
        assertFalse(jwtService.parse("not-a-jwt-at-all").isPresent());
        assertFalse(jwtService.parseMfaChallenge("not-a-jwt-at-all").isPresent());
    }

    private AppUser testUser() {
        AppUser user = new AppUser();
        user.setEmail("test@wesee.my");
        user.setName("Test User");
        user.setRole(Role.COMPANY_ADMIN);
        user.setTokenVersion(0);
        user.setActive(true);
        setId(user, UUID.randomUUID());
        return user;
    }

    private void setId(AppUser user, UUID id) {
        try {
            var field = com.wesee.esg.common.BaseEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
