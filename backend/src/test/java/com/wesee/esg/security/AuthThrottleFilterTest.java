/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class AuthThrottleFilterTest {

    /** Spring Boot's auto-configured mapper carries JavaTimeModule; a bare one does not,
     *  and ApiError has an Instant on it. */
    private static ObjectMapper jsonMapper() {
        return new ObjectMapper().registerModule(new JavaTimeModule());
    }

    private AuthThrottleProperties properties() {
        AuthThrottleProperties properties = new AuthThrottleProperties();
        properties.setLoginPerWindow(3);
        properties.setSignupPerWindow(2);
        properties.setWindowMinutes(5);
        return properties;
    }

    private int post(AuthThrottleFilter filter, String path, String address) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRequestURI(path);
        request.setRemoteAddr(address);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response.getStatus();
    }

    private MockHttpServletResponse postFully(AuthThrottleFilter filter, String path, String address) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRequestURI(path);
        request.setRemoteAddr(address);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    @Test
    void signInIsAllowedUpToTheLimitAndRefusedAfterIt() throws Exception {
        AuthThrottleFilter filter = new AuthThrottleFilter(properties(), jsonMapper());

        assertThat(post(filter, "/api/v1/auth/login", "10.0.0.1")).isEqualTo(200);
        assertThat(post(filter, "/api/v1/auth/login", "10.0.0.1")).isEqualTo(200);
        assertThat(post(filter, "/api/v1/auth/login", "10.0.0.1")).isEqualTo(200);
        assertThat(post(filter, "/api/v1/auth/login", "10.0.0.1")).isEqualTo(429);
    }

    @Test
    void theRefusalCarriesTheWaitInAHeaderNotJustProse() throws Exception {
        AuthThrottleFilter filter = new AuthThrottleFilter(properties(), jsonMapper());
        for (int i = 0; i < 3; i++) {
            post(filter, "/api/v1/auth/login", "10.0.0.1");
        }

        MockHttpServletResponse response = postFully(filter, "/api/v1/auth/login", "10.0.0.1");

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(Integer.parseInt(response.getHeader("Retry-After"))).isBetween(1, 300);
        assertThat(response.getContentAsString()).contains("Too many attempts");
    }

    @Test
    void oneAddressRunningOutDoesNotBlockAnother() throws Exception {
        AuthThrottleFilter filter = new AuthThrottleFilter(properties(), jsonMapper());
        for (int i = 0; i < 4; i++) {
            post(filter, "/api/v1/auth/login", "10.0.0.1");
        }

        assertThat(post(filter, "/api/v1/auth/login", "10.0.0.2")).isEqualTo(200);
    }

    @Test
    void registrationHasItsOwnTighterAllowance() throws Exception {
        AuthThrottleFilter filter = new AuthThrottleFilter(properties(), jsonMapper());

        assertThat(post(filter, "/api/v1/auth/register", "10.0.0.1")).isEqualTo(200);
        assertThat(post(filter, "/api/v1/auth/register", "10.0.0.1")).isEqualTo(200);
        assertThat(post(filter, "/api/v1/auth/register", "10.0.0.1")).isEqualTo(429);
    }

    @Test
    void eachEndpointCountsSeparatelySoSigningInDoesNotSpendTheRegistrationAllowance() throws Exception {
        AuthThrottleFilter filter = new AuthThrottleFilter(properties(), jsonMapper());
        for (int i = 0; i < 4; i++) {
            post(filter, "/api/v1/auth/login", "10.0.0.1");
        }

        assertThat(post(filter, "/api/v1/auth/register", "10.0.0.1")).isEqualTo(200);
    }

    @Test
    void passwordResetAndVerificationResendAreCoveredToo() throws Exception {
        AuthThrottleFilter filter = new AuthThrottleFilter(properties(), jsonMapper());

        post(filter, "/api/v1/auth/forgot-password", "10.0.0.1");
        post(filter, "/api/v1/auth/forgot-password", "10.0.0.1");
        assertThat(post(filter, "/api/v1/auth/forgot-password", "10.0.0.1")).isEqualTo(429);

        post(filter, "/api/v1/auth/resend-verification", "10.0.0.1");
        post(filter, "/api/v1/auth/resend-verification", "10.0.0.1");
        assertThat(post(filter, "/api/v1/auth/resend-verification", "10.0.0.1")).isEqualTo(429);
    }

    @Test
    void anythingElseIsLeftAlone() throws Exception {
        AuthThrottleFilter filter = new AuthThrottleFilter(properties(), jsonMapper());

        for (int i = 0; i < 20; i++) {
            assertThat(post(filter, "/api/v1/indicators", "10.0.0.1")).isEqualTo(200);
        }
    }

    @Test
    void aGetOnAThrottledPathIsNotCounted() throws Exception {
        AuthThrottleFilter filter = new AuthThrottleFilter(properties(), jsonMapper());

        for (int i = 0; i < 20; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/auth/login");
            request.setRequestURI("/api/v1/auth/login");
            request.setRemoteAddr("10.0.0.1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertThat(response.getStatus()).isEqualTo(200);
        }
    }

    @Test
    void turningItOffLetsEverythingThrough() throws Exception {
        AuthThrottleProperties properties = properties();
        properties.setEnabled(false);
        AuthThrottleFilter filter = new AuthThrottleFilter(properties, jsonMapper());

        for (int i = 0; i < 20; i++) {
            assertThat(post(filter, "/api/v1/auth/login", "10.0.0.1")).isEqualTo(200);
        }
    }

    @Test
    void theTrackingMapDoesNotGrowWithoutBound() throws Exception {
        AuthThrottleProperties properties = properties();
        properties.setMaxTrackedClients(50);
        AuthThrottleFilter filter = new AuthThrottleFilter(properties, jsonMapper());

        // Far more addresses than the cap; the oldest are evicted, and the newest still get their
        // own allowance rather than inheriting someone else's spent one.
        for (int i = 0; i < 500; i++) {
            assertThat(post(filter, "/api/v1/auth/login", "10.1." + (i / 256) + "." + (i % 256))).isEqualTo(200);
        }
    }
}
