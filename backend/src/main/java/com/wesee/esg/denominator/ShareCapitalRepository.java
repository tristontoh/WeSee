/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ShareCapitalRepository extends JpaRepository<ShareCapital, UUID> {
    Optional<ShareCapital> findByCompanyIdAndFiscalYear(UUID companyId, Integer fiscalYear);
}
