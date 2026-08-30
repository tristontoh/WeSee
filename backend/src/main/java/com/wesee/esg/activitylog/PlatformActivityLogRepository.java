/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.activitylog;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PlatformActivityLogRepository extends JpaRepository<PlatformActivityLog, UUID> {
    List<PlatformActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<PlatformActivityLog> findByCompanyIdOrderByCreatedAtDesc(UUID companyId, Pageable pageable);
}
