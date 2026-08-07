package com.wesee.esg.emailverification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/** findByToken is intentionally unscoped by company/user — looked up by an unauthenticated caller before any company context exists. */
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {
    Optional<EmailVerificationToken> findByToken(String token);

    void deleteByUserId(UUID userId);
}
