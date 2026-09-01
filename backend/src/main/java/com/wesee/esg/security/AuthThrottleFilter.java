/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wesee.esg.common.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Caps how often one address may hit the endpoints that need no token: sign-in, registration,
 * password reset and verification resend. Every one of them was previously unlimited, so a script
 * could open workspaces or guess passwords as fast as the network allowed.
 *
 * A fixed window per address, held in memory. Two things that means, said plainly rather than
 * discovered later:
 *
 * <ul>
 *   <li>The count is per instance. One process is what runs today; behind two, the effective limit
 *       doubles. It does not silently fail open, it just loosens, and the per-account lock in
 *       {@link com.wesee.esg.auth.LoginAttemptService} does not care how many instances there are.</li>
 *   <li>The address comes from the servlet container, which behind a reverse proxy is the proxy.
 *       Set {@code server.forward-headers-strategy=framework} in that deployment or every caller
 *       shares one bucket. X-Forwarded-For is deliberately not read here: trusting a header the
 *       caller writes turns the limit into a suggestion.</li>
 * </ul>
 *
 * A fixed window lets through up to twice the limit across a window boundary. That is a known
 * property, not an oversight — it is a speed bump in front of a password guesser, and the lock on
 * the account is what actually stops one.
 */
public class AuthThrottleFilter extends OncePerRequestFilter {

    private static final String LOGIN_PATH = "/api/v1/auth/login";
    private static final String[] SIGNUP_PATHS = {
            "/api/v1/auth/register",
            "/api/v1/auth/forgot-password",
            "/api/v1/auth/resend-verification",
    };

    private final AuthThrottleProperties properties;
    private final ObjectMapper objectMapper;

    /** Access is always under the monitor below; LinkedHashMap gives insertion order for eviction. */
    private final Map<String, Window> windows = new LinkedHashMap<>();

    public AuthThrottleFilter(AuthThrottleProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    private record Window(Instant startedAt, int count) {
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        int limit = limitFor(request);
        if (limit <= 0) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = request.getRequestURI() + "|" + request.getRemoteAddr();
        long retryAfter = registerHit(key, limit);
        if (retryAfter <= 0) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(retryAfter));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        ApiError body = ApiError.of(429, "Too Many Requests",
                "Too many attempts from this connection. Try again in " + humanise(retryAfter) + ".",
                request.getRequestURI());
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    /** 0 for a request this filter does not police. */
    private int limitFor(HttpServletRequest request) {
        if (!properties.isEnabled() || !HttpMethod.POST.matches(request.getMethod())) {
            return 0;
        }
        String path = request.getRequestURI();
        if (LOGIN_PATH.equals(path)) {
            return properties.getLoginPerWindow();
        }
        for (String signupPath : SIGNUP_PATHS) {
            if (signupPath.equals(path)) {
                return properties.getSignupPerWindow();
            }
        }
        return 0;
    }

    /** Seconds the caller must wait, or 0 when the request is within its allowance. */
    private synchronized long registerHit(String key, int limit) {
        Instant now = Instant.now();
        Duration windowLength = Duration.ofMinutes(properties.getWindowMinutes());

        Window window = windows.get(key);
        if (window == null || Duration.between(window.startedAt(), now).compareTo(windowLength) >= 0) {
            // Re-insert so eviction order tracks recency rather than first contact.
            windows.remove(key);
            windows.put(key, new Window(now, 1));
            evictOldest();
            return 0;
        }

        if (window.count() >= limit) {
            return Math.max(1, windowLength.minus(Duration.between(window.startedAt(), now)).toSeconds());
        }

        windows.put(key, new Window(window.startedAt(), window.count() + 1));
        return 0;
    }

    private void evictOldest() {
        int max = Math.max(1, properties.getMaxTrackedClients());
        var iterator = windows.entrySet().iterator();
        while (windows.size() > max && iterator.hasNext()) {
            iterator.next();
            iterator.remove();
        }
    }

    private static String humanise(long seconds) {
        if (seconds < 60) {
            return seconds + " second" + (seconds == 1 ? "" : "s");
        }
        long minutes = (seconds + 59) / 60;
        return minutes + " minute" + (minutes == 1 ? "" : "s");
    }
}
