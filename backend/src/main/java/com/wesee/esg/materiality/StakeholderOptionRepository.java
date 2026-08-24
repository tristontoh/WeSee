package com.wesee.esg.materiality;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StakeholderOptionRepository extends JpaRepository<StakeholderOption, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the list
     * visibly reshuffles after a save. {@code id} breaks ties, since rows seeded in one
     * transaction can share a timestamp. Chips are toggled constantly; without ordering they rearrange under the cursor.
     */
    List<StakeholderOption> findByCompanyIdOrderByCreatedAtAscIdAsc(UUID companyId);
    boolean existsByCompanyId(UUID companyId);
}
