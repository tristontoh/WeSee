/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.platform;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.email.EmailService;
import com.wesee.esg.email.dto.TestEmailResponse;
import com.wesee.esg.platform.dto.PlatformSettingsResponse;
import com.wesee.esg.platform.dto.UpdatePlatformSettingsRequest;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.security.JwtProperties;
import com.wesee.esg.security.SecretCryptoService;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class PlatformSettingsService {

    private final PlatformSettingsRepository repository;
    private final AppUserRepository appUserRepository;
    private final CurrentUserProvider currentUserProvider;
    private final SecretCryptoService cryptoService;
    private final EmailService emailService;
    private final String defaultAppBaseUrl;
    private final long sessionExpirationMinutes;

    public PlatformSettingsService(PlatformSettingsRepository repository,
                                    AppUserRepository appUserRepository,
                                    CurrentUserProvider currentUserProvider,
                                    SecretCryptoService cryptoService,
                                    EmailService emailService,
                                    JwtProperties jwtProperties,
                                    @Value("${wesee.app.base-url}") String defaultAppBaseUrl) {
        this.repository = repository;
        this.appUserRepository = appUserRepository;
        this.currentUserProvider = currentUserProvider;
        this.cryptoService = cryptoService;
        this.emailService = emailService;
        this.defaultAppBaseUrl = defaultAppBaseUrl;
        this.sessionExpirationMinutes = jwtProperties.getExpirationMinutes();
    }

    @Transactional(readOnly = true)
    public PlatformSettingsResponse get() {
        return repository.findFirstByOrderByCreatedAtAsc()
                .map(s -> PlatformSettingsResponse.from(s, sessionExpirationMinutes))
                .orElseGet(() -> PlatformSettingsResponse.notConfigured(sessionExpirationMinutes));
    }

    @Transactional
    public PlatformSettingsResponse update(UpdatePlatformSettingsRequest request) {
        PlatformSettings settings = repository.findFirstByOrderByCreatedAtAsc().orElseGet(PlatformSettings::new);

        if (request.password() != null && !request.password().isBlank()) {
            settings.setSmtpPasswordEncrypted(cryptoService.encrypt(request.password()));
        }

        if (Boolean.TRUE.equals(request.enabled())) {
            boolean hostMissing = request.smtpHost() == null || request.smtpHost().isBlank();
            boolean usernameMissing = request.smtpUsername() == null || request.smtpUsername().isBlank();
            boolean fromMissing = request.fromAddress() == null || request.fromAddress().isBlank();
            if (hostMissing || usernameMissing || fromMissing) {
                throw new IllegalArgumentException("SMTP host, username, and from address are required to enable the platform default sender");
            }
            if (settings.getSmtpPasswordEncrypted() == null) {
                throw new IllegalArgumentException("Password is required when configuring SMTP for the first time");
            }
        }

        if (request.stripeSecretKey() != null && !request.stripeSecretKey().isBlank()) {
            settings.setStripeSecretKeyEncrypted(cryptoService.encrypt(request.stripeSecretKey()));
        }
        if (request.stripeWebhookSecret() != null && !request.stripeWebhookSecret().isBlank()) {
            settings.setStripeWebhookSecretEncrypted(cryptoService.encrypt(request.stripeWebhookSecret()));
        }

        if (Boolean.TRUE.equals(request.stripeEnabled())) {
            boolean publishableMissing = request.stripePublishableKey() == null || request.stripePublishableKey().isBlank();
            if (publishableMissing) {
                throw new IllegalArgumentException("Publishable key is required to enable Stripe payments");
            }
            if (settings.getStripeSecretKeyEncrypted() == null) {
                throw new IllegalArgumentException("Secret key is required when configuring Stripe for the first time");
            }
        }

        settings.setSmtpHost(request.smtpHost());
        settings.setSmtpPort(request.smtpPort());
        settings.setSmtpUsername(request.smtpUsername());
        settings.setFromAddress(request.fromAddress());
        settings.setEnabled(request.enabled());
        settings.setAppBaseUrl(request.appBaseUrl());
        settings.setPlatformName(request.platformName());
        settings.setSupportEmail(request.supportEmail());
        settings.setRequire2fa(request.require2fa());
        settings.setStripePublishableKey(request.stripePublishableKey());
        settings.setStripeEnabled(request.stripeEnabled());
        settings = repository.save(settings);

        return PlatformSettingsResponse.from(settings, sessionExpirationMinutes);
    }

    @Transactional
    public TestEmailResponse sendTest() {
        PlatformSettings settings = repository.findFirstByOrderByCreatedAtAsc()
                .orElseThrow(() -> new NotFoundException("No platform SMTP settings configured yet — save settings first"));
        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        EmailService.SmtpConfig config = new EmailService.SmtpConfig(
                settings.getSmtpHost(), settings.getSmtpPort(), settings.getSmtpUsername(),
                settings.getSmtpPasswordEncrypted(), settings.getFromAddress());
        TestEmailResponse result = emailService.sendTestEmail(config, user.getEmail());

        settings.setLastTestAt(Instant.now());
        settings.setLastTestSuccess(result.success());
        settings.setLastTestMessage(result.message());
        repository.save(settings);

        return result;
    }

    @Transactional(readOnly = true)
    public String getEffectiveAppBaseUrl() {
        return repository.findFirstByOrderByCreatedAtAsc()
                .map(PlatformSettings::getAppBaseUrl)
                .filter(url -> url != null && !url.isBlank())
                .orElse(defaultAppBaseUrl);
    }

    @Transactional(readOnly = true)
    public boolean isMfaRequired() {
        return repository.findFirstByOrderByCreatedAtAsc()
                .map(PlatformSettings::getRequire2fa)
                .map(Boolean.TRUE::equals)
                .orElse(false);
    }
}
