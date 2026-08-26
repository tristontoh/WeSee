package com.wesee.esg.config;

import com.wesee.esg.apiaccess.ApiTokenRepository;
import com.wesee.esg.security.ApiTokenAuthenticationFilter;
import com.wesee.esg.security.JwtAuthenticationFilter;
import com.wesee.esg.security.JwtService;
import com.wesee.esg.session.UserSessionRepository;
import com.wesee.esg.user.AppUserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

    public SecurityConfig(org.springframework.core.env.Environment env) {
        String raw = env.getProperty("wesee.cors.allowed-origins", "http://localhost:3000");
        this.allowedOrigins = raw.split(",");
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
                                            ApiTokenAuthenticationFilter apiTokenAuthenticationFilter) throws Exception {
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
                        .requestMatchers("/actuator/health/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(apiTokenAuthenticationFilter, JwtAuthenticationFilter.class);

        return http.build();
    }
}
