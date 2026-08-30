/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

@Service
public class JwtService {

    private static final String MFA_CHALLENGE_PURPOSE = "mfa_challenge";
    private static final Duration MFA_CHALLENGE_TTL = Duration.ofMinutes(5);

    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(AppUser user, UUID jti) {
        Instant now = Instant.now();
        Instant expiry = now.plus(Duration.ofMinutes(properties.getExpirationMinutes()));

        var builder = Jwts.builder()
                .subject(user.getId().toString())
                .claim("role", user.getRole().name())
                .claim("tokenVersion", user.getTokenVersion())
                .claim("email", user.getEmail())
                .claim("jti", jti.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key);

        if (user.getCompany() != null) {
            builder.claim("companyId", user.getCompany().getId().toString());
        }

        return builder.compact();
    }

    public Optional<DecodedToken> parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String roleStr = claims.get("role", String.class);
            Integer tokenVersion = claims.get("tokenVersion", Integer.class);
            if (roleStr == null || tokenVersion == null) {
                return Optional.empty();
            }

            UUID userId = UUID.fromString(claims.getSubject());
            UUID companyId = claims.get("companyId", String.class) != null
                    ? UUID.fromString(claims.get("companyId", String.class))
                    : null;
            Role role = Role.valueOf(roleStr);
            String email = claims.get("email", String.class);
            String jtiStr = claims.get("jti", String.class);
            UUID jti = jtiStr != null ? UUID.fromString(jtiStr) : null;

            return Optional.of(new DecodedToken(userId, companyId, role, email, tokenVersion, jti));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /**
     * A short-lived, narrowly-purposed token issued between password verification and MFA code
     * verification during login. Carries no role/tokenVersion/jti claims so it can never be
     * mistaken for (or accepted as) a real session token by JwtAuthenticationFilter.
     */
    public String generateMfaChallengeToken(UUID userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("purpose", MFA_CHALLENGE_PURPOSE)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(MFA_CHALLENGE_TTL)))
                .signWith(key)
                .compact();
    }

    public Optional<UUID> parseMfaChallenge(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (!MFA_CHALLENGE_PURPOSE.equals(claims.get("purpose", String.class))) {
                return Optional.empty();
            }
            return Optional.of(UUID.fromString(claims.getSubject()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public record DecodedToken(UUID userId, UUID companyId, Role role, String email, int tokenVersion, UUID jti) {
    }
}
