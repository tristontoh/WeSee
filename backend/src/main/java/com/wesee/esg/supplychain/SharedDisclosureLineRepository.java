/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * No company id here, deliberately. Lines are only ever loaded for a disclosure the caller has
 * already proved it may read, through one of {@link SharedDisclosureRepository}'s bound finders —
 * so the check happens once, where the boundary actually is.
 */
public interface SharedDisclosureLineRepository extends JpaRepository<SharedDisclosureLine, UUID> {

    List<SharedDisclosureLine> findByDisclosureIdOrderByScopeAsc(UUID disclosureId);
}
