package com.wesee.esg.mfa;

import com.wesee.esg.common.exceptions.ForbiddenException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.mfa.dto.BackupCodesResponse;
import com.wesee.esg.mfa.dto.TotpEnrollResponse;
import com.wesee.esg.mfa.dto.TotpStatusResponse;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.security.SecretCryptoService;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class MfaService {

    private static final String ISSUER = "WeSee";
    private static final int BACKUP_CODE_COUNT = 10;
    private static final String BACKUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final QrGenerator qrGenerator = new ZxingPngQrGenerator();
    private final CodeVerifier codeVerifier = new DefaultCodeVerifier(new DefaultCodeGenerator(), new SystemTimeProvider());
    private final SecureRandom random = new SecureRandom();

    private final TotpSecretRepository totpSecretRepository;
    private final BackupCodeRepository backupCodeRepository;
    private final AppUserRepository appUserRepository;
    private final SecretCryptoService secretCryptoService;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserProvider currentUserProvider;

    public MfaService(TotpSecretRepository totpSecretRepository,
                       BackupCodeRepository backupCodeRepository,
                       AppUserRepository appUserRepository,
                       SecretCryptoService secretCryptoService,
                       PasswordEncoder passwordEncoder,
                       CurrentUserProvider currentUserProvider) {
        this.totpSecretRepository = totpSecretRepository;
        this.backupCodeRepository = backupCodeRepository;
        this.appUserRepository = appUserRepository;
        this.secretCryptoService = secretCryptoService;
        this.passwordEncoder = passwordEncoder;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public TotpEnrollResponse enroll() {
        UUID userId = currentUserProvider.getPrincipal().userId();
        String email = currentUserProvider.getPrincipal().email();
        String secret = secretGenerator.generate();

        TotpSecret entity = totpSecretRepository.findByUserId(userId).orElseGet(TotpSecret::new);
        entity.setUserId(userId);
        entity.setSecretEncrypted(secretCryptoService.encrypt(secret));
        entity.setEnabled(false);
        entity.setEnabledAt(null);
        totpSecretRepository.save(entity);

        QrData data = new QrData.Builder()
                .label(email)
                .secret(secret)
                .issuer(ISSUER)
                .build();

        String qrCodeDataUri;
        try {
            byte[] imageData = qrGenerator.generate(data);
            qrCodeDataUri = "data:" + qrGenerator.getImageMimeType() + ";base64," + Base64.getEncoder().encodeToString(imageData);
        } catch (QrGenerationException e) {
            throw new IllegalStateException("Failed to generate QR code", e);
        }

        return new TotpEnrollResponse(secret, qrCodeDataUri, data.getUri());
    }

    @Transactional
    public BackupCodesResponse verifyAndEnable(String code) {
        UUID userId = currentUserProvider.getPrincipal().userId();
        TotpSecret entity = totpSecretRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("No pending 2FA enrollment — start enrollment first"));

        String secret = secretCryptoService.decrypt(entity.getSecretEncrypted());
        if (!codeVerifier.isValidCode(secret, code)) {
            throw new ForbiddenException("Invalid verification code");
        }

        entity.setEnabled(true);
        entity.setEnabledAt(Instant.now());
        totpSecretRepository.save(entity);

        return new BackupCodesResponse(regenerateBackupCodesFor(userId));
    }

    @Transactional(readOnly = true)
    public TotpStatusResponse status() {
        UUID userId = currentUserProvider.getPrincipal().userId();
        return totpSecretRepository.findByUserIdAndEnabledTrue(userId)
                .map(s -> new TotpStatusResponse(true, s.getEnabledAt()))
                .orElseGet(() -> new TotpStatusResponse(false, null));
    }

    @Transactional
    public void disable(String password, String code) {
        UUID userId = currentUserProvider.getPrincipal().userId();
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        TotpSecret entity = totpSecretRepository.findByUserIdAndEnabledTrue(userId)
                .orElseThrow(() -> new NotFoundException("2FA is not enabled"));

        requireReauth(user, entity, password, code);

        totpSecretRepository.delete(entity);
        backupCodeRepository.deleteByUserId(userId);
    }

    @Transactional
    public BackupCodesResponse regenerateBackupCodes(String password, String code) {
        UUID userId = currentUserProvider.getPrincipal().userId();
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        TotpSecret entity = totpSecretRepository.findByUserIdAndEnabledTrue(userId)
                .orElseThrow(() -> new NotFoundException("2FA is not enabled"));

        requireReauth(user, entity, password, code);

        return new BackupCodesResponse(regenerateBackupCodesFor(userId));
    }

    @Transactional(readOnly = true)
    public boolean isEnabled(UUID userId) {
        return totpSecretRepository.findByUserIdAndEnabledTrue(userId).isPresent();
    }

    /** Used only by the login flow — tries the TOTP code first, then falls back to a backup code. */
    @Transactional
    public boolean verifyLoginCode(UUID userId, String code) {
        var entityOpt = totpSecretRepository.findByUserIdAndEnabledTrue(userId);
        if (entityOpt.isEmpty()) {
            return false;
        }
        String secret = secretCryptoService.decrypt(entityOpt.get().getSecretEncrypted());
        if (codeVerifier.isValidCode(secret, code)) {
            return true;
        }
        return consumeBackupCode(userId, code);
    }

    private void requireReauth(AppUser user, TotpSecret entity, String password, String code) {
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ForbiddenException("Current password is incorrect");
        }
        String secret = secretCryptoService.decrypt(entity.getSecretEncrypted());
        boolean validTotp = codeVerifier.isValidCode(secret, code);
        if (!validTotp && !consumeBackupCode(user.getId(), code)) {
            throw new ForbiddenException("Invalid verification code");
        }
    }

    private boolean consumeBackupCode(UUID userId, String code) {
        String hash = sha256Hex(normalizeBackupCode(code));
        return backupCodeRepository.findByUserIdAndCodeHashAndUsedAtIsNull(userId, hash)
                .map(bc -> {
                    bc.setUsedAt(Instant.now());
                    backupCodeRepository.save(bc);
                    return true;
                })
                .orElse(false);
    }

    private List<String> regenerateBackupCodesFor(UUID userId) {
        backupCodeRepository.deleteByUserId(userId);
        List<String> plaintextCodes = new ArrayList<>(BACKUP_CODE_COUNT);
        for (int i = 0; i < BACKUP_CODE_COUNT; i++) {
            String plaintext = generateBackupCode();
            plaintextCodes.add(plaintext);

            BackupCode entity = new BackupCode();
            entity.setUserId(userId);
            entity.setCodeHash(sha256Hex(normalizeBackupCode(plaintext)));
            backupCodeRepository.save(entity);
        }
        return plaintextCodes;
    }

    private String generateBackupCode() {
        StringBuilder sb = new StringBuilder(9);
        for (int i = 0; i < 8; i++) {
            if (i == 4) {
                sb.append('-');
            }
            sb.append(BACKUP_CODE_ALPHABET.charAt(random.nextInt(BACKUP_CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    private String normalizeBackupCode(String code) {
        return code.trim().toUpperCase().replace("-", "").replace(" ", "");
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
