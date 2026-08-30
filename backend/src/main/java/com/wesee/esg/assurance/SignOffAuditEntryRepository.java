/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.assurance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SignOffAuditEntryRepository extends JpaRepository<SignOffAuditEntry, UUID> {
    List<SignOffAuditEntry> findByCompanyIdAndFiscalYearOrderByCreatedAtDesc(UUID companyId, Integer fiscalYear);
}
