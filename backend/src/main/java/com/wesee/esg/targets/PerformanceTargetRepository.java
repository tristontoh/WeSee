package com.wesee.esg.targets;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PerformanceTargetRepository extends JpaRepository<PerformanceTarget, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the list
     * visibly reshuffles after a save. {@code id} breaks ties, since rows seeded in one
     * transaction can share a timestamp. Targets a user just edited must not jump position.
     */
    List<PerformanceTarget> findByCompanyIdOrderByCreatedAtAscIdAsc(UUID companyId);
    Optional<PerformanceTarget> findByIdAndCompanyId(UUID id, UUID companyId);
}
