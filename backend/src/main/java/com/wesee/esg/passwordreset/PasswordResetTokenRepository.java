package com.wesee.esg.passwordreset;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** findByToken is intentionally unscoped by company/user — looked up by an unauthenticated caller before any session exists. */
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByToken(String token);

    /** Every link for this account that has not been used and has not yet expired. */
    List<PasswordResetToken> findByUserIdAndUsedAtIsNull(UUID userId);
}
