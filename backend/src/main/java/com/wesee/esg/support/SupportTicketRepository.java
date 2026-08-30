/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.support;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the list
     * visibly reshuffles after a save. {@code id} breaks ties, since rows seeded in one
     * transaction can share a timestamp. Newest first, and a status change must not shuffle the queue.
     */
    List<SupportTicket> findByCompanyIdOrderByCreatedAtDescIdDesc(UUID companyId);

    /** The support team's cross-tenant queue. Ordered for the same reason, and to match it. */
    List<SupportTicket> findAllByOrderByCreatedAtDescIdDesc();
}
