package com.wesee.esg.passwordreset;

import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.email.EmailService;
import com.wesee.esg.platform.PlatformSettingsService;
import com.wesee.esg.session.UserSessionService;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@Service
public class PasswordResetService {

    private static final int TOKEN_VALIDITY_MINUTES = 60;

    private final PasswordResetTokenRepository tokenRepository;
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final PlatformSettingsService platformSettingsService;
    private final UserSessionService userSessionService;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(PasswordResetTokenRepository tokenRepository,
                                 AppUserRepository appUserRepository,
                                 PasswordEncoder passwordEncoder,
                                 EmailService emailService,
                                 PlatformSettingsService platformSettingsService,
                                 UserSessionService userSessionService) {
        this.tokenRepository = tokenRepository;
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.platformSettingsService = platformSettingsService;
        this.userSessionService = userSessionService;
    }

    /** Silently no-ops for unknown emails so the caller can't use this to enumerate registered accounts. */
    @Transactional
    public void requestReset(String email) {
        appUserRepository.findByEmailIgnoreCase(email)
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .ifPresent(this::sendResetEmail);
    }

    private void sendResetEmail(AppUser user) {
        PasswordResetToken tokenEntity = new PasswordResetToken();
        tokenEntity.setUserId(user.getId());
        tokenEntity.setToken(generateToken());
        tokenEntity.setExpiresAt(Instant.now().plus(TOKEN_VALIDITY_MINUTES, ChronoUnit.MINUTES));
        tokenRepository.save(tokenEntity);

        String resetUrl = platformSettingsService.getEffectiveAppBaseUrl() + "/#/reset-password?token=" + tokenEntity.getToken();
        UUID companyId = user.getCompany() != null ? user.getCompany().getId() : null;
        emailService.sendPasswordResetEmail(companyId, user.getEmail(), user.getName(), resetUrl);
    }

    @Transactional(readOnly = true)
    public void validate(String token) {
        requireValidToken(token);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken tokenEntity = requireValidToken(token);

        AppUser user = appUserRepository.findById(tokenEntity.getUserId())
                .orElseThrow(() -> new NotFoundException("This reset link is invalid or has expired"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setTokenVersion(user.getTokenVersion() + 1);
        appUserRepository.save(user);
        userSessionService.revokeAll(user.getId());

        tokenEntity.setUsedAt(Instant.now());
        tokenRepository.save(tokenEntity);
    }

    private PasswordResetToken requireValidToken(String token) {
        PasswordResetToken tokenEntity = tokenRepository.findByToken(token)
                .orElseThrow(() -> new NotFoundException("This reset link is invalid or has expired"));
        if (tokenEntity.getUsedAt() != null) {
            throw new ConflictException("This reset link has already been used");
        }
        if (tokenEntity.getExpiresAt().isBefore(Instant.now())) {
            throw new ConflictException("This reset link has expired — request a new one");
        }
        return tokenEntity;
    }

    private String generateToken() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
