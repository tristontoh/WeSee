/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the list
     * visibly reshuffles after a save. {@code id} breaks ties, since rows seeded in one
     * transaction can share a timestamp. The founding admin leads; role changes must not reorder the team list.
     */
    List<AppUser> findByCompanyIdOrderByCreatedAtAscIdAsc(UUID companyId);

    /** Guards deletion of a custom role that people are still assigned to — see CustomRoleService. */
    boolean existsByCustomRoleId(UUID customRoleId);

    /** Backs the last-admin guard in CompanyService — a company must never lose its final active admin. */
    long countByCompanyIdAndRoleAndActiveTrue(UUID companyId, Role role);
}
