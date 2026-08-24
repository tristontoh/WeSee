package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Scope3CategoryRepository extends JpaRepository<Scope3Category, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the list
     * visibly reshuffles after a save. {@code id} breaks ties, since rows seeded in one
     * transaction can share a timestamp. EmissionsService then sorts by standard category
     * number, where every tenant-added category ties — that sort is stable, so this ordering
     * is what keeps custom categories in place when one is renamed.
     */
    List<Scope3Category> findByCompanyIdOrderByCreatedAtAscIdAsc(UUID companyId);
    Optional<Scope3Category> findByIdAndCompanyId(UUID id, UUID companyId);
    boolean existsByCompanyId(UUID companyId);
}
