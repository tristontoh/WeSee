package com.wesee.esg.tenant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeamInviteRepository extends JpaRepository<TeamInvite, UUID> {
    List<TeamInvite> findByCompanyIdAndAcceptedAtIsNullAndRevokedAtIsNullOrderByCreatedAtDesc(UUID companyId);

    /** Unscoped by design — looked up by an unauthenticated caller before any company context (and therefore the companyFilter) exists. */
    Optional<TeamInvite> findByToken(String token);

    boolean existsByCompanyIdAndEmailIgnoreCaseAndAcceptedAtIsNullAndRevokedAtIsNull(UUID companyId, String email);

    /** A role is still in use while an unaccepted invite names it, not only while a user holds it. */
    boolean existsByCustomRoleIdAndAcceptedAtIsNullAndRevokedAtIsNull(UUID customRoleId);
}
