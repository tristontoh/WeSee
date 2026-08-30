/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.export;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExportHistoryItemRepository extends JpaRepository<ExportHistoryItem, UUID> {
    List<ExportHistoryItem> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

    Optional<ExportHistoryItem> findByIdAndCompanyId(UUID id, UUID companyId);
}
