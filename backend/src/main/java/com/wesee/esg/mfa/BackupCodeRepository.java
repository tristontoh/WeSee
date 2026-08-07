package com.wesee.esg.mfa;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BackupCodeRepository extends JpaRepository<BackupCode, UUID> {
    List<BackupCode> findByUserId(UUID userId);

    Optional<BackupCode> findByUserIdAndCodeHashAndUsedAtIsNull(UUID userId, String codeHash);

    void deleteByUserId(UUID userId);
}
