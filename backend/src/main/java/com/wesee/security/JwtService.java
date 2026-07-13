package com.wesee.security;

import com.wesee.model.Organization;
import com.wesee.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

/**
 * JWT issue/verify. The token carries org_id + org_type + email so every request is
 * tenant-scoped (mirrors the FastAPI Principal). Verified via the Authorization header.
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final long ttlMs;

    public JwtService(@Value("${wesee.jwt-secret}") String secret,
                      @Value("${wesee.jwt-ttl-minutes}") long ttlMinutes) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.ttlMs = ttlMinutes * 60_000;
    }

    public String issue(User user, Organization org) {
        return Jwts.builder()
                .subject(user.getId())
                .claims(Map.of(
                        "user_id", user.getId(),
                        "org_id", org.getId(),
                        "org_type", org.getOrgType().getValue(),
                        "email", user.getEmail()))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + ttlMs))
                .signWith(key)
                .compact();
    }

    /** Validate a raw "Bearer xxx" header and return its claims, or 401. */
    public Claims requireAuth(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token");
        }
        try {
            return Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(authHeader.substring(7)).getPayload();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }
    }
}
