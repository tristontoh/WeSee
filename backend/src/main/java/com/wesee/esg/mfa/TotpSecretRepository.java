package com.wesee.esg.mfa;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TotpSecretRepository extends JpaRepository<TotpSecret, UUID> {
    Optional<TotpSecret> findByUserId(UUID userId);

    Optional<TotpSecret> findByUserIdAndEnabledTrue(UUID userId);
}
