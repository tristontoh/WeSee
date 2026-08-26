package com.wesee.esg.ai;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A company's bring-your-own LLM provider + API key. One row per company — switching provider
 *  requires re-entering a new key for it. */
@Entity
@Table(name = "ai_provider_config")
@Getter
@Setter
@NoArgsConstructor
public class AiProviderConfig extends TenantOwnedEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiProvider provider;

    @Column(nullable = false, length = 100)
    private String model;

    /** AES/GCM-encrypted (see {@link com.wesee.esg.security.SecretCryptoService}) — never stored or returned in plaintext. */
    @Column(name = "api_key_encrypted", nullable = false, length = 1000)
    private String apiKeyEncrypted;

    @Column(nullable = false)
    private Boolean enabled = true;
}
