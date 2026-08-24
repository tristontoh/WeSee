package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmissionActivityEntryRepository extends JpaRepository<EmissionActivityEntry, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the list
     * visibly reshuffles after a save. {@code id} breaks ties, since rows seeded in one
     * transaction can share a timestamp. The activity log reads as a sequence, so entries stay in the order they were added.
     */
    List<EmissionActivityEntry> findByCompanyIdAndFiscalYearOrderByCreatedAtAscIdAsc(UUID companyId, int fiscalYear);

    Optional<EmissionActivityEntry> findByIdAndCompanyId(UUID id, UUID companyId);
}
