package com.wesee.esg.mfa;

import com.wesee.esg.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * enabled=false means "pending enrollment, not yet verified" — a user re-enrolling before
 * confirming simply overwrites this row. The plaintext base32 secret is never persisted, only
 * SecretCryptoService.encrypt(secret); it must be decrypted to verify a login/step-up code.
 */
@Entity
@Table(name = "user_totp_secret")
@Getter
@Setter
@NoArgsConstructor
public class TotpSecret extends BaseEntity {

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "secret_encrypted", nullable = false, length = 500)
    private String secretEncrypted;

    @Column(nullable = false)
    private Boolean enabled = false;

    @Column(name = "enabled_at")
    private Instant enabledAt;
}
