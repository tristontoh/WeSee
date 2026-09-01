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
 * Decides whether the authenticated caller's company may use the API at all right now. Two reasons
 * it might not, checked in this order:
 *
 * <ol>
 *   <li><b>Suspended or closed.</b> {@code company.active} is what a PLATFORM_ADMIN turns off
 *       (TenantAdminController's status endpoint); {@code closedAt} is what PrivacyService sets when
 *       a COMPANY_ADMIN closes the account. Until now nothing read either one — suspension wrote a
 *       column and changed nothing, so every user of a suspended company carried on working until
 *       their token happened to expire. 403.</li>
 *   <li><b>Trial expired</b> and not marked converted-to-paid (Company.trialEndsAt /
 *       trialConverted; a PLATFORM_ADMIN flips the latter via TenantAdminController's PATCH
 *       /{id}/trial — manual because there is no automated Stripe charge/webhook flow yet). 402.</li>
 * </ol>
 *
 * Suspension is checked first: telling a suspended company to go and pay would be both wrong and
 * insulting.
 *
 * Runs after {@link JwtAuthenticationFilter} so the authenticated principal, and its companyId, is
 * already on the SecurityContext. Platform-level roles are not scoped to a company and pass through
 * untouched.
 *
 * Two exemptions keep the client able to explain itself. GET /api/v1/auth/me is exempt from both,
 * so the app can load a session and render the blocked state rather than a broken shell.
 * /api/v1/company/billing/** is exempt from the trial check only: a company blocked on trial can
 * pay its way back in through Stripe Checkout, whereas paying does nothing for a suspended one, and
 * offering it a checkout would be taking money for access it is not going to get.
 */
public class CompanyAccessFilter extends OncePerRequestFilter {

    private static final String ME_PATH = "/api/v1/auth/me";
    private static final String BILLING_PREFIX = "/api/v1/company/billing/";

    private final CompanyRepository companyRepository;
    private final ObjectMapper objectMapper;

    public CompanyAccessFilter(CompanyRepository companyRepository, ObjectMapper objectMapper) {
        this.companyRepository = companyRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (ME_PATH.equals(path)) {
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

        if (!Boolean.TRUE.equals(company.getActive()) || company.getClosedAt() != null) {
            reject(request, response, 403, "Forbidden",
                    "This workspace has been suspended. Contact support if you believe this is a mistake.");
            return;
        }

        Instant trialEndsAt = company.getTrialEndsAt();
        boolean trialExpired = trialEndsAt != null
                && Instant.now().isAfter(trialEndsAt)
                && !Boolean.TRUE.equals(company.getTrialConverted());
        if (trialExpired && !path.startsWith(BILLING_PREFIX)) {
            reject(request, response, 402, "Payment Required",
                    "Your free trial ended on " + trialEndsAt + " — contact your account admin or support to continue.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void reject(HttpServletRequest request, HttpServletResponse response,
                        int status, String error, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        ApiError body = ApiError.of(status, error, message, request.getRequestURI());
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
