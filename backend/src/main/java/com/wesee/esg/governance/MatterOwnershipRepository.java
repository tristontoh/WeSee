/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.governance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MatterOwnershipRepository extends JpaRepository<MatterOwnership, UUID> {
    /**
     * Ordered explicitly: an unordered scan returns rows in heap order, so updating an owner
     * moved that row to the end of the list and the table visibly reshuffled after every save.
     * Category first keeps the environmental/social/governance grouping the UI relies on.
     */
    List<MatterOwnership> findByCompanyIdOrderByMatterCategoryAscMatterNameAsc(UUID companyId);

    Optional<MatterOwnership> findByCompanyIdAndMatterId(UUID companyId, String matterId);
}
