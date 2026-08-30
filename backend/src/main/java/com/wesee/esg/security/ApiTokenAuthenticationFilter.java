/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import com.wesee.esg.apiaccess.ApiToken;
import com.wesee.esg.apiaccess.ApiTokenRepository;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import jakarta.persistence.EntityManager;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.hibernate.Session;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

/**
 * Authenticates requests bearing an API token (prefix "lst_") issued via ApiTokenController,
 * distinct from ordinary user-session JWTs handled by JwtAuthenticationFilter. Only acts when the
 * bearer value has the API-token prefix, so the two filters never both fire on the same request.
 * The token "acts as" its creating user for company-scoping/audit-attribution purposes, but is
 * additionally restricted by scope on every /api/external/** endpoint (see ApiScopeService).
 */
public class ApiTokenAuthenticationFilter extends OncePerRequestFilter {

    private static final String TOKEN_PREFIX = "lst_";

    private final ApiTokenRepository apiTokenRepository;
    private final AppUserRepository appUserRepository;
    private final EntityManager entityManager;

    public ApiTokenAuthenticationFilter(ApiTokenRepository apiTokenRepository, AppUserRepository appUserRepository, EntityManager entityManager) {
        this.apiTokenRepository = apiTokenRepository;
        this.appUserRepository = appUserRepository;
        this.entityManager = entityManager;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer " + TOKEN_PREFIX)) {
            String plaintext = header.substring(7);
            Optional<ApiToken> tokenOpt = apiTokenRepository.findByTokenHash(sha256Hex(plaintext));

            if (tokenOpt.isPresent()) {
                ApiToken token = tokenOpt.get();
                boolean revoked = token.getRevokedAt() != null;
                boolean expired = token.getExpiresAt() != null && token.getExpiresAt().isBefore(Instant.now());

                if (!revoked && !expired) {
                    Optional<AppUser> userOpt = appUserRepository.findById(token.getCreatedByUserId());

                    if (userOpt.isPresent() && Boolean.TRUE.equals(userOpt.get().getActive())) {
                        AppUser user = userOpt.get();
                        Set<String> scopes = new HashSet<>(token.getScopes());
                        var principal = new WeSeePrincipal(user.getId(), token.getCompanyId(), user.getRole(), user.getEmail(), scopes, null);

                        var authorities = java.util.List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
                        var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        Session session = entityManager.unwrap(Session.class);
                        if (session.getFactory().getDefinedFilterNames().contains("companyFilter")) {
                            session.enableFilter("companyFilter").setParameter("companyId", token.getCompanyId());
                        }

                        token.setLastUsedAt(Instant.now());
                        apiTokenRepository.save(token);
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
