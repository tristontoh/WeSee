/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BusinessSegmentRepository extends JpaRepository<BusinessSegment, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the list
     * visibly reshuffles after a save. {@code id} breaks ties, since rows seeded in one
     * transaction can share a timestamp. Segments are edited in place and feed IFRS disclosures.
     */
    List<BusinessSegment> findByCompanyIdOrderByCreatedAtAscIdAsc(UUID companyId);
    Optional<BusinessSegment> findByIdAndCompanyId(UUID id, UUID companyId);
    boolean existsByCompanyIdAndNameIgnoreCase(UUID companyId, String name);
    boolean existsByCompanyId(UUID companyId);
}
