package com.wesee.esg.security;

import com.wesee.esg.session.UserSession;
import com.wesee.esg.session.UserSessionRepository;
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
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Validates the bearer JWT, loads the current {@link AppUser} to confirm the token's
 * tokenVersion still matches (cheap session-invalidation without refresh-token infrastructure),
 * populates the {@link SecurityContextHolder}, and enables the Hibernate {@code companyFilter}
 * on the request-bound persistence context as the data-access-layer tenant-isolation safety net
 * (requires {@code spring.jpa.open-in-view=true} so the same session spans the whole request).
 *
 * Also checks the token's jti against user_session for granular per-device revocation. Tokens
 * minted before this check existed carry no jti claim; those are let through on tokenVersion+active
 * alone (their own natural expiry retires this fallback within one token lifetime of deploy).
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Duration LAST_SEEN_UPDATE_INTERVAL = Duration.ofMinutes(5);

    private final JwtService jwtService;
    private final AppUserRepository appUserRepository;
    private final UserSessionRepository userSessionRepository;
    private final EntityManager entityManager;

    public JwtAuthenticationFilter(JwtService jwtService, AppUserRepository appUserRepository,
                                    UserSessionRepository userSessionRepository, EntityManager entityManager) {
        this.jwtService = jwtService;
        this.appUserRepository = appUserRepository;
        this.userSessionRepository = userSessionRepository;
        this.entityManager = entityManager;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            Optional<JwtService.DecodedToken> decoded = jwtService.parse(token);

            if (decoded.isPresent()) {
                JwtService.DecodedToken d = decoded.get();
                Optional<AppUser> userOpt = appUserRepository.findById(d.userId());

                if (userOpt.isPresent()) {
                    AppUser user = userOpt.get();
                    boolean versionMatches = user.getTokenVersion().equals(d.tokenVersion());

                    if (versionMatches && Boolean.TRUE.equals(user.getActive()) && sessionValid(d)) {
                        var companyId = user.getCompany() != null ? user.getCompany().getId() : null;
                        var principal = new WeSeePrincipal(user.getId(), companyId, user.getRole(), user.getEmail(), java.util.Set.of(), d.jti());

                        var authorities = java.util.List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
                        var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        if (companyId != null) {
                            Session session = entityManager.unwrap(Session.class);
                            if (session.getFactory().getDefinedFilterNames().contains("companyFilter")) {
                                session.enableFilter("companyFilter").setParameter("companyId", companyId);
                            }
                        }
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean sessionValid(JwtService.DecodedToken d) {
        if (d.jti() == null) {
            return true;
        }
        Optional<UserSession> sessionOpt = userSessionRepository.findByJti(d.jti().toString());
        if (sessionOpt.isEmpty()) {
            return false;
        }
        UserSession session = sessionOpt.get();
        boolean valid = session.getRevokedAt() == null && session.getExpiresAt().isAfter(Instant.now());
        if (valid && Duration.between(session.getLastSeenAt(), Instant.now()).compareTo(LAST_SEEN_UPDATE_INTERVAL) >= 0) {
            session.setLastSeenAt(Instant.now());
            userSessionRepository.save(session);
        }
        return valid;
    }
}
