/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import com.wesee.esg.common.ApiError;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.user.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Blocks all API access for a company whose free trial has expired and hasn't been marked
 * converted-to-paid (see Company.trialEndsAt/trialConverted; a PLATFORM_ADMIN flips the latter via
 * TenantAdminController's PATCH /{id}/trial — manual because there's no automated Stripe
 * charge/webhook flow yet).
 *
 * Runs after {@link JwtAuthenticationFilter} so the authenticated principal (and its companyId) is
 * already on the SecurityContext. Platform-level roles (not scoped to a single company) and a
 * small allowlist needed to keep the frontend itself functional while blocked pass through
 * untouched: GET /api/v1/auth/me (so it can refresh the session and render the trial-expired
 * state), and /api/v1/company/billing/** (so a blocked company can still pay its way back in via
 * Stripe Checkout — otherwise there'd be no way out except a platform admin's manual toggle).
 */
public class TrialAccessFilter extends OncePerRequestFilter {

    private final CompanyRepository companyRepository;
    private final ObjectMapper objectMapper;

    public TrialAccessFilter(CompanyRepository companyRepository, ObjectMapper objectMapper) {
        this.companyRepository = companyRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        if (isExempt(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication != null && authentication.getPrincipal() instanceof WeSeePrincipal principal)) {
            filterChain.doFilter(request, response);
            return;
        }

        UUID companyId = principal.companyId();
        if (companyId == null || principal.role() == Role.PLATFORM_ADMIN || principal.role() == Role.SUPERADMIN) {
            filterChain.doFilter(request, response);
            return;
        }

        Optional<Company> companyOpt = companyRepository.findById(companyId);
        if (companyOpt.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        Company company = companyOpt.get();
        Instant trialEndsAt = company.getTrialEndsAt();
        boolean expired = trialEndsAt != null
                && Instant.now().isAfter(trialEndsAt)
                && !Boolean.TRUE.equals(company.getTrialConverted());
        if (!expired) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(402);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        ApiError body = ApiError.of(402, "Payment Required",
                "Your free trial ended on " + trialEndsAt + " — contact your account admin or support to continue.",
                request.getRequestURI());
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    private boolean isExempt(String path) {
        return path.equals("/api/v1/auth/me") || path.startsWith("/api/v1/company/billing/");
    }
}
