/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the list
     * visibly reshuffles after a save. {@code id} breaks ties, since rows seeded in one
     * transaction can share a timestamp. Renaming a subsidiary or changing its plan must not
     * move it in the group list.
     */
    List<Company> findByParentCompanyIdOrderByCreatedAtAscIdAsc(UUID parentCompanyId);

    /** The platform admin's all-tenants list. Ordered for the same reason, and to match it. */
    List<Company> findAllByOrderByCreatedAtAscIdAsc();

    Optional<Company> findByStripeCustomerId(String stripeCustomerId);

    /**
     * Row-locking read for the checkout-confirmation critical section. Two tabs confirming the same
     * session must serialise rather than race: the loser's stale in-memory copy would otherwise
     * overwrite the winner's just-saved stripeCustomerId and stripeSubscriptionId with nulls.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Company c where c.id = :id")
    Optional<Company> findByIdForUpdate(@Param("id") UUID id);

}
