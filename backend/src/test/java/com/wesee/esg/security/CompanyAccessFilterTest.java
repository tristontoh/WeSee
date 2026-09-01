/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.user.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CompanyAccessFilterTest {

    /** Spring Boot's auto-configured mapper carries JavaTimeModule; a bare one does not,
     *  and ApiError has an Instant on it. */
    private static ObjectMapper jsonMapper() {
        return new ObjectMapper().registerModule(new JavaTimeModule());
    }

    private final CompanyRepository companyRepository = Mockito.mock(CompanyRepository.class);
    private final CompanyAccessFilter filter = new CompanyAccessFilter(companyRepository, jsonMapper());

    private final UUID companyId = UUID.randomUUID();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(Role role) {
        var principal = new WeSeePrincipal(UUID.randomUUID(), companyId, role, "someone@example.com", Set.of(), UUID.randomUUID());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, java.util.List.of()));
    }

    private Company company() {
        Company company = new Company();
        company.setName("WeSee Manufacturing Sdn Bhd");
        Mockito.when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
        return company;
    }

    private MockHttpServletResponse call(String path) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
        request.setRequestURI(path);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    @Test
    void aLiveCompanyPassesThrough() throws Exception {
        authenticate(Role.COMPANY_ADMIN);
        company();

        assertThat(call("/api/v1/indicators").getStatus()).isEqualTo(200);
    }

    @Test
    void aSuspendedCompanyIsRefused() throws Exception {
        authenticate(Role.COMPANY_ADMIN);
        company().setActive(false);

        MockHttpServletResponse response = call("/api/v1/indicators");

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("suspended");
    }

    @Test
    void aClosedCompanyIsRefused() throws Exception {
        authenticate(Role.COMPANY_ADMIN);
        company().setClosedAt(Instant.now());

        assertThat(call("/api/v1/indicators").getStatus()).isEqualTo(403);
    }

    @Test
    void suspensionIsAnsweredBeforeTrialExpiry() throws Exception {
        authenticate(Role.COMPANY_ADMIN);
        Company company = company();
        company.setActive(false);
        company.setTrialEndsAt(Instant.now().minus(30, ChronoUnit.DAYS));

        // 402 here would invite a suspended company to pay for access it will not get.
        assertThat(call("/api/v1/indicators").getStatus()).isEqualTo(403);
    }

    @Test
    void anExpiredTrialStillAnswers402() throws Exception {
        authenticate(Role.COMPANY_ADMIN);
        company().setTrialEndsAt(Instant.now().minus(1, ChronoUnit.DAYS));

        assertThat(call("/api/v1/indicators").getStatus()).isEqualTo(402);
    }

    @Test
    void aConvertedCompanyIsNotBlockedByItsOldTrialDate() throws Exception {
        authenticate(Role.COMPANY_ADMIN);
        Company company = company();
        company.setTrialEndsAt(Instant.now().minus(90, ChronoUnit.DAYS));
        company.setTrialConverted(true);

        assertThat(call("/api/v1/indicators").getStatus()).isEqualTo(200);
    }

    @Test
    void authMeStaysReachableSoTheClientCanExplainItself() throws Exception {
        authenticate(Role.COMPANY_ADMIN);
        company().setActive(false);

        assertThat(call("/api/v1/auth/me").getStatus()).isEqualTo(200);
    }

    @Test
    void billingIsExemptOnAnExpiredTrialButNotOnSuspension() throws Exception {
        authenticate(Role.COMPANY_ADMIN);
        Company company = company();
        company.setTrialEndsAt(Instant.now().minus(1, ChronoUnit.DAYS));

        assertThat(call("/api/v1/company/billing/checkout").getStatus()).isEqualTo(200);

        company.setActive(false);
        assertThat(call("/api/v1/company/billing/checkout").getStatus()).isEqualTo(403);
    }

    @Test
    void platformAdminsAreNotScopedToACompanyAndPassThrough() throws Exception {
        authenticate(Role.PLATFORM_ADMIN);
        company().setActive(false);

        assertThat(call("/api/v1/admin/tenants").getStatus()).isEqualTo(200);
    }

    @Test
    void anUnauthenticatedRequestIsLeftToTheRestOfTheChain() throws Exception {
        assertThat(call("/api/v1/indicators").getStatus()).isEqualTo(200);
    }
}
