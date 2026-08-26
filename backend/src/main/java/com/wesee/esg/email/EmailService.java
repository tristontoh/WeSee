package com.wesee.esg.email;

import com.wesee.esg.email.dto.TestEmailResponse;
import com.wesee.esg.platform.PlatformSettings;
import com.wesee.esg.platform.PlatformSettingsRepository;
import com.wesee.esg.security.SecretCryptoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Properties;
import java.util.UUID;

/**
 * Sends transactional email via, in order: a tenant's own "bring your own SMTP" settings
 * ({@link CompanyEmailSettings}), the DB-backed platform default ({@link PlatformSettings}, editable
 * by a platform admin without a redeploy), or the env-var-configured platform {@link JavaMailSender}
 * (from {@code spring.mail.*} / {@code SMTP_*}). If none is configured, sending is silently skipped —
 * callers (e.g. team invites) already fall back to a shareable link.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender platformMailSender;
    private final String platformFromAddress;
    private final boolean platformConfigured;
    private final CompanyEmailSettingsRepository companyEmailSettingsRepository;
    private final PlatformSettingsRepository platformSettingsRepository;
    private final SecretCryptoService cryptoService;

    public EmailService(JavaMailSender platformMailSender,
                         @Value("${wesee.mail.from}") String platformFromAddress,
                         @Value("${spring.mail.host:}") String platformMailHost,
                         CompanyEmailSettingsRepository companyEmailSettingsRepository,
                         PlatformSettingsRepository platformSettingsRepository,
                         SecretCryptoService cryptoService) {
        this.platformMailSender = platformMailSender;
        this.platformFromAddress = platformFromAddress;
        this.platformConfigured = platformMailHost != null && !platformMailHost.isBlank();
        this.companyEmailSettingsRepository = companyEmailSettingsRepository;
        this.platformSettingsRepository = platformSettingsRepository;
        this.cryptoService = cryptoService;
    }

    public void sendInviteEmail(UUID companyId, String toEmail, String toName, String companyName, String inviterName, Object role, String inviteUrl) {
        Sender sender = resolveSender(companyId);
        if (sender == null) {
            log.info("No SMTP configured for company {} or the platform — skipping invite email to {}; share the invite link manually.", companyId, toEmail);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(sender.fromAddress());
            message.setTo(toEmail);
            message.setSubject(inviterName + " invited you to join " + companyName + " on WeSee");
            message.setText(
                    "Hi " + toName + ",\n\n" +
                    inviterName + " has invited you to join " + companyName + " on WeSee as a " + role + ".\n\n" +
                    "Accept your invite here:\n" + inviteUrl + "\n\n" +
                    "This link expires in 7 days and can only be used once.\n\n" +
                    "— WeSee ESG Reporting Platform"
            );
            sender.mailSender().send(message);
        } catch (Exception e) {
            log.warn("Failed to send invite email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendVerificationEmail(UUID companyId, String toEmail, String toName, String verifyUrl) {
        Sender sender = resolveSender(companyId);
        if (sender == null) {
            log.info("No SMTP configured for company {} or the platform — skipping verification email to {}; verify link: {}", companyId, toEmail, verifyUrl);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(sender.fromAddress());
            message.setTo(toEmail);
            message.setSubject("Verify your email for WeSee");
            message.setText(
                    "Hi " + toName + ",\n\n" +
                    "Please verify your email address to activate your WeSee account:\n\n" + verifyUrl + "\n\n" +
                    "This link expires in 24 hours.\n\n" +
                    "— WeSee ESG Reporting Platform"
            );
            sender.mailSender().send(message);
        } catch (Exception e) {
            log.warn("Failed to send verification email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendPasswordResetEmail(UUID companyId, String toEmail, String toName, String resetUrl) {
        Sender sender = resolveSender(companyId);
        if (sender == null) {
            log.info("No SMTP configured for company {} or the platform — skipping password reset email to {}; reset link: {}", companyId, toEmail, resetUrl);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(sender.fromAddress());
            message.setTo(toEmail);
            message.setSubject("Reset your WeSee password");
            message.setText(
                    "Hi " + toName + ",\n\n" +
                    "We received a request to reset your WeSee password. Click the link below to choose a new one:\n\n" + resetUrl + "\n\n" +
                    "This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.\n\n" +
                    "— WeSee ESG Reporting Platform"
            );
            sender.mailSender().send(message);
        } catch (Exception e) {
            log.warn("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
        }
    }

    /** Sends a real test email using the given (not-yet-persisted-as-tested) settings, reporting success/failure back to the caller synchronously. */
    public TestEmailResponse sendTestEmail(CompanyEmailSettings settings, String toEmail) {
        return sendTestEmail(toConfig(settings), toEmail);
    }

    public TestEmailResponse sendTestEmail(SmtpConfig config, String toEmail) {
        JavaMailSenderImpl sender = buildSender(config);
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(config.fromAddress());
            message.setTo(toEmail);
            message.setSubject("WeSee SMTP test email");
            message.setText(
                    "This is a test email confirming your SMTP settings are working correctly.\n\n" +
                    "Host: " + config.host() + ":" + config.port() + "\n" +
                    "From: " + config.fromAddress() + "\n\n" +
                    "— WeSee ESG Reporting Platform"
            );
            sender.send(message);
            return new TestEmailResponse(true, "Test email sent successfully to " + toEmail + ".");
        } catch (Exception e) {
            return new TestEmailResponse(false, rootMessage(e));
        }
    }

    /** SMTP transport parameters common to both a tenant's and the platform's stored settings. */
    public record SmtpConfig(String host, int port, String username, String passwordEncrypted, String fromAddress) {
    }

    private record Sender(JavaMailSender mailSender, String fromAddress) {
    }

    private Sender resolveSender(UUID companyId) {
        Optional<CompanyEmailSettings> tenantSettings = companyEmailSettingsRepository.findByCompanyId(companyId)
                .filter(s -> Boolean.TRUE.equals(s.getEnabled()));
        if (tenantSettings.isPresent()) {
            CompanyEmailSettings s = tenantSettings.get();
            return new Sender(buildSender(toConfig(s)), s.getFromAddress());
        }

        Optional<PlatformSettings> dbPlatformSettings = platformSettingsRepository.findFirstByOrderByCreatedAtAsc()
                .filter(s -> Boolean.TRUE.equals(s.getEnabled()));
        if (dbPlatformSettings.isPresent()) {
            PlatformSettings s = dbPlatformSettings.get();
            SmtpConfig config = new SmtpConfig(s.getSmtpHost(), s.getSmtpPort(), s.getSmtpUsername(), s.getSmtpPasswordEncrypted(), s.getFromAddress());
            return new Sender(buildSender(config), s.getFromAddress());
        }

        if (platformConfigured) {
            return new Sender(platformMailSender, platformFromAddress);
        }
        return null;
    }

    private SmtpConfig toConfig(CompanyEmailSettings s) {
        return new SmtpConfig(s.getSmtpHost(), s.getSmtpPort(), s.getSmtpUsername(), s.getSmtpPasswordEncrypted(), s.getFromAddress());
    }

    private JavaMailSenderImpl buildSender(SmtpConfig config) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(config.host());
        sender.setPort(config.port());
        sender.setUsername(config.username());
        sender.setPassword(cryptoService.decrypt(config.passwordEncrypted()));

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.connectiontimeout", "8000");
        props.put("mail.smtp.timeout", "8000");
        props.put("mail.smtp.writetimeout", "8000");
        return sender;
    }

    private String rootMessage(Exception e) {
        Throwable root = e;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        return root.getMessage() != null ? root.getMessage() : e.getClass().getSimpleName();
    }
}
