package com.wesee.esg.session;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.session.dto.SessionResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class UserSessionService {

    private final UserSessionRepository repository;
    private final CurrentUserProvider currentUserProvider;

    public UserSessionService(UserSessionRepository repository, CurrentUserProvider currentUserProvider) {
        this.repository = repository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public void record(UUID userId, UUID jti, String ipAddress, String userAgent, Instant expiresAt) {
        UserSession session = new UserSession();
        session.setUserId(userId);
        session.setJti(jti.toString());
        session.setIpAddress(ipAddress);
        session.setUserAgent(userAgent);
        session.setLastSeenAt(Instant.now());
        session.setExpiresAt(expiresAt);
        repository.save(session);
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> list() {
        UUID userId = currentUserProvider.getPrincipal().userId();
        UUID currentJti = currentUserProvider.getPrincipal().jti();
        return repository.findByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByLastSeenAtDesc(userId, Instant.now())
                .stream()
                .map(s -> SessionResponse.from(s, currentJti))
                .toList();
    }

    @Transactional
    public void revoke(UUID sessionId) {
        UUID userId = currentUserProvider.getPrincipal().userId();
        UserSession session = repository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new NotFoundException("Session not found"));
        session.setRevokedAt(Instant.now());
        repository.save(session);
    }

    @Transactional
    public void revokeOthers() {
        UUID userId = currentUserProvider.getPrincipal().userId();
        UUID currentJti = currentUserProvider.getPrincipal().jti();
        Instant now = Instant.now();
        for (UserSession session : repository.findByUserIdAndRevokedAtIsNull(userId)) {
            if (currentJti == null || !session.getJti().equals(currentJti.toString())) {
                session.setRevokedAt(now);
                repository.save(session);
            }
        }
    }

    /** Reporting-accuracy only — actual enforcement of "log out everywhere" is AppUser.tokenVersion. */
    @Transactional
    public void revokeAll(UUID userId) {
        Instant now = Instant.now();
        for (UserSession session : repository.findByUserIdAndRevokedAtIsNull(userId)) {
            session.setRevokedAt(now);
            repository.save(session);
        }
    }
}
