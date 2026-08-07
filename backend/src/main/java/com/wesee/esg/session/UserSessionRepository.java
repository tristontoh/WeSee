package com.wesee.esg.session;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {
    Optional<UserSession> findByJti(String jti);

    Optional<UserSession> findByIdAndUserId(UUID id, UUID userId);

    List<UserSession> findByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByLastSeenAtDesc(UUID userId, Instant now);

    List<UserSession> findByUserIdAndRevokedAtIsNull(UUID userId);
}
