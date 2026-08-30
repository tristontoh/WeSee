/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.email;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** A tenant's own outbound SMTP configuration ("bring your own SMTP") for emails sent on their behalf, e.g. team invites. */
@Entity
@Table(name = "company_email_settings")
@Getter
@Setter
@NoArgsConstructor
public class CompanyEmailSettings extends TenantOwnedEntity {

    @Column(name = "smtp_host", nullable = false, length = 255)
    private String smtpHost;

    @Column(name = "smtp_port", nullable = false)
    private Integer smtpPort = 587;

    @Column(name = "smtp_username", nullable = false, length = 255)
    private String smtpUsername;

    /** AES/GCM-encrypted (see {@link com.wesee.esg.security.SecretCryptoService}) — never stored or returned in plaintext. */
    @Column(name = "smtp_password_encrypted", nullable = false, length = 1000)
    private String smtpPasswordEncrypted;

    @Column(name = "from_address", nullable = false, length = 255)
    private String fromAddress;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(name = "last_test_at")
    private Instant lastTestAt;

    @Column(name = "last_test_success")
    private Boolean lastTestSuccess;

    @Column(name = "last_test_message", length = 1000)
    private String lastTestMessage;
}
