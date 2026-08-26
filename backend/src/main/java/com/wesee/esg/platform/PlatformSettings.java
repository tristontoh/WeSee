package com.wesee.esg.platform;

import com.wesee.esg.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Singleton row (at most one) holding platform-wide config that's otherwise env-var-only —
 * a default outbound SMTP sender used when a tenant hasn't configured their own
 * (see EmailService#resolveSender), and the app base URL used to build links in system emails.
 * Deliberately does not include the JWT secret or CORS origins — see EmailVerificationService /
 * SecretCryptoService for why those must stay env-var-only.
 */
@Entity
@Table(name = "platform_settings")
@Getter
@Setter
@NoArgsConstructor
public class PlatformSettings extends BaseEntity {

    @Column(name = "smtp_host", length = 255)
    private String smtpHost;

    @Column(name = "smtp_port", nullable = false)
    private Integer smtpPort = 587;

    @Column(name = "smtp_username", length = 255)
    private String smtpUsername;

    /** AES/GCM-encrypted (see {@link com.wesee.esg.security.SecretCryptoService}) — never stored or returned in plaintext. */
    @Column(name = "smtp_password_encrypted", length = 1000)
    private String smtpPasswordEncrypted;

    @Column(name = "from_address", length = 255)
    private String fromAddress;

    @Column(nullable = false)
    private Boolean enabled = false;

    @Column(name = "app_base_url", length = 500)
    private String appBaseUrl;

    @Column(name = "platform_name", length = 200)
    private String platformName;

    @Column(name = "support_email", length = 255)
    private String supportEmail;

    @Column(name = "require_2fa", nullable = false)
    private Boolean require2fa = false;

    @Column(name = "last_test_at")
    private Instant lastTestAt;

    @Column(name = "last_test_success")
    private Boolean lastTestSuccess;

    @Column(name = "last_test_message", length = 1000)
    private String lastTestMessage;

    /** Publishable key is meant to ship to the client, so it's stored and returned in plaintext. */
    @Column(name = "stripe_publishable_key", length = 255)
    private String stripePublishableKey;

    /** AES/GCM-encrypted (see {@link com.wesee.esg.security.SecretCryptoService}) — never stored or returned in plaintext. */
    @Column(name = "stripe_secret_key_encrypted", length = 1000)
    private String stripeSecretKeyEncrypted;

    /** AES/GCM-encrypted — never stored or returned in plaintext. */
    @Column(name = "stripe_webhook_secret_encrypted", length = 1000)
    private String stripeWebhookSecretEncrypted;

    @Column(name = "stripe_enabled", nullable = false)
    private Boolean stripeEnabled = false;
}
