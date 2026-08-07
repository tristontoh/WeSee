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

/** SHA-256 hex digest of a one-time backup code — the plaintext is only ever shown once, at generation time. */
@Entity
@Table(name = "user_backup_code")
@Getter
@Setter
@NoArgsConstructor
public class BackupCode extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(name = "used_at")
    private Instant usedAt;
}
