/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.config;

import com.wesee.esg.apiaccess.ApiTokenRepository;
import com.wesee.esg.security.ApiTokenAuthenticationFilter;
import com.wesee.esg.security.JwtAuthenticationFilter;
import com.wesee.esg.security.JwtService;
import com.wesee.esg.session.UserSessionRepository;
import com.wesee.esg.user.AppUserRepository;
import jakarta.persistence.EntityManager;
import com.wesee.esg.security.TrialAccessFilter;
import com.wesee.esg.tenant.CompanyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.util.matcher.AndRequestMatcher;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.NegatedRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final String[] allowedOrigins;
    private final boolean apiDocsPublic;
    private final String metricsScrapeToken;

    public SecurityConfig(org.springframework.core.env.Environment env) {
        String raw = env.getProperty("wesee.cors.allowed-origins", "http://localhost:3000");
        this.allowedOrigins = raw.split(",");
        // Swagger describes every endpoint, its parameters and its shapes. That is a map for
        // anyone probing the API, and it was readable without signing in. Open in development,
        // authenticated everywhere else.
        // Same rule as the JWT guard, from the same place. These two used to disagree: docker
        // counted as development here, so a compose deploy published the whole API map.
        this.apiDocsPublic = com.wesee.esg.security.DeploymentProfiles.isDevelopment(env.getActiveProfiles());
        // Empty unless a monitoring stack is deployed. MetricsAccessGuard refuses everything when
        // it is unset, so the endpoints stay closed until someone sets it on purpose.
        this.metricsScrapeToken = env.getProperty("wesee.metrics.scrape-token", "");
    }

    /** Every GET that is not one of the server's own routes: the client and its assets. */
    private static RequestMatcher appShell() {
        return new AndRequestMatcher(
                new AntPathRequestMatcher("/**", HttpMethod.GET.name()),
                new NegatedRequestMatcher(new OrRequestMatcher(
                        new AntPathRequestMatcher("/api/**"),
                        new AntPathRequestMatcher("/actuator/**"),
                        new AntPathRequestMatcher("/v3/api-docs/**"),
                        new AntPathRequestMatcher("/swagger-ui/**"))));
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwtService, AppUserRepository appUserRepository,
                                                            UserSessionRepository userSessionRepository, EntityManager entityManager) {
        return new JwtAuthenticationFilter(jwtService, appUserRepository, userSessionRepository, entityManager);
    }

    @Bean
    public ApiTokenAuthenticationFilter apiTokenAuthenticationFilter(ApiTokenRepository apiTokenRepository, AppUserRepository appUserRepository, EntityManager entityManager) {
        return new ApiTokenAuthenticationFilter(apiTokenRepository, appUserRepository, entityManager);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(allowedOrigins));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter,
                                            ApiTokenAuthenticationFilter apiTokenAuthenticationFilter,
                                            TrialAccessFilter trialAccessFilter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/login/verify-mfa",
                                "/api/v1/auth/verify-email", "/api/v1/auth/resend-verification").permitAll()
                        // Reached before any session exists, by someone who cannot log in.
                        .requestMatchers("/api/v1/auth/forgot-password", "/api/v1/auth/reset-password/**").permitAll()
                        .requestMatchers("/api/v1/auth/invites/**").permitAll()
                        .requestMatchers("/api/v1/webhooks/**").permitAll()
                        // Read by the marketing site, which has no token. Anything mapped under
                        // /api/v1/public is world-readable by this rule alone — put nothing there that
                        // is not already printed on a public page.
                        .requestMatchers(HttpMethod.GET, "/api/v1/public/**").permitAll()
                        .requestMatchers("/actuator/health/**").permitAll()
                        // Prometheus cannot use a session JWT (they expire daily and belong to a
                        // person) or an API token (those only reach /api/external/v1), so the
                        // scraper carries a bearer token of its own. Closed unless one is set.
                        .requestMatchers("/actuator/prometheus", "/actuator/metrics/**")
                            .access((principal, ctx) -> new org.springframework.security.authorization.AuthorizationDecision(
                                    com.wesee.esg.security.MetricsAccessGuard.permits(
                                            metricsScrapeToken,
                                            ctx.getRequest().getHeader("Authorization"))))
                        // isSignedIn, not isAuthenticated: Spring's anonymous token answers
                        // true to isAuthenticated, so the previous check here let everybody read
                        // the whole API description in every profile.
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**")
                            .access((principal, ctx) -> new org.springframework.security.authorization.AuthorizationDecision(
                                    apiDocsPublic
                                            || com.wesee.esg.security.SignedInCheck.isSignedIn(principal.get())))
                        // The client itself. It is HTML and JavaScript with no figures in it —
                        // everything it displays comes from an API call that authenticates on its
                        // own — so the shell has to be readable before anyone has signed in, or the
                        // login page cannot load. Routes like /dashboard have no file behind them
                        // and are answered by SpaResourceConfig with that same shell.
                        .requestMatchers(appShell()).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(apiTokenAuthenticationFilter, JwtAuthenticationFilter.class)
                // After the JWT filter, because it needs the authenticated company to know whose
                // trial to check.
                .addFilterAfter(trialAccessFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    /** Stripe signs its callbacks itself, so the webhook route authenticates by signature, not JWT. */
    @Bean
    public TrialAccessFilter trialAccessFilter(CompanyRepository companyRepository, ObjectMapper objectMapper) {
        return new TrialAccessFilter(companyRepository, objectMapper);
    }

}
