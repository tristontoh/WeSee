package com.wesee.esg.emailverification;

import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.email.EmailService;
import com.wesee.esg.platform.PlatformSettingsService;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@Service
public class EmailVerificationService {

    private static final int TOKEN_VALIDITY_HOURS = 24;

    private final EmailVerificationTokenRepository tokenRepository;
    private final AppUserRepository appUserRepository;
    private final EmailService emailService;
    private final PlatformSettingsService platformSettingsService;
    private final SecureRandom random = new SecureRandom();

    public EmailVerificationService(EmailVerificationTokenRepository tokenRepository,
                                     AppUserRepository appUserRepository,
                                     EmailService emailService,
                                     PlatformSettingsService platformSettingsService) {
        this.tokenRepository = tokenRepository;
        this.appUserRepository = appUserRepository;
        this.emailService = emailService;
        this.platformSettingsService = platformSettingsService;
    }

    @Transactional
    public void sendVerificationEmail(AppUser user) {
        EmailVerificationToken tokenEntity = new EmailVerificationToken();
        tokenEntity.setUserId(user.getId());
        tokenEntity.setToken(generateToken());
        tokenEntity.setExpiresAt(Instant.now().plus(TOKEN_VALIDITY_HOURS, ChronoUnit.HOURS));
        tokenRepository.save(tokenEntity);

        // Hash routing, not path: the app mounts a HashRouter, so a "/verify-email?token=…" link
        // asks the static host for a file that is not there. The fragment is what the router reads.
        String verifyUrl = platformSettingsService.getEffectiveAppBaseUrl() + "/#/verify-email?token=" + tokenEntity.getToken();
        UUID companyId = user.getCompany() != null ? user.getCompany().getId() : null;
        emailService.sendVerificationEmail(companyId, user.getEmail(), user.getName(), verifyUrl);
    }

    @Transactional
    public void verify(String token) {
        EmailVerificationToken tokenEntity = tokenRepository.findByToken(token)
                .orElseThrow(() -> new NotFoundException("Invalid verification link"));

        AppUser user = appUserRepository.findById(tokenEntity.getUserId())
                .orElseThrow(() -> new NotFoundException("Invalid verification link"));

        if (tokenEntity.getUsedAt() != null) {
            if (Boolean.TRUE.equals(user.getEmailVerified())) {
                return; // already verified via this or another token — idempotent no-op
            }
            throw new ConflictException("This link has already been used");
        }
        if (tokenEntity.getExpiresAt().isBefore(Instant.now())) {
            throw new ConflictException("This verification link has expired — request a new one");
        }

        user.setEmailVerified(true);
        user.setEmailVerifiedAt(Instant.now());
        appUserRepository.save(user);

        tokenEntity.setUsedAt(Instant.now());
        tokenRepository.save(tokenEntity);
    }

    @Transactional
    public void resend(String email) {
        appUserRepository.findByEmailIgnoreCase(email)
                .filter(u -> !Boolean.TRUE.equals(u.getEmailVerified()))
                .ifPresent(this::sendVerificationEmail);
    }

    private String generateToken() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
