/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmissionValueRepository extends JpaRepository<EmissionValue, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — editing one
     * year's figure would otherwise move its point within the scope's series. There is one row
     * per fiscal year (unique per scope), so the year is a total order on its own.
     */
    List<EmissionValue> findByCompanyIdAndScopeOrderByFiscalYearAsc(UUID companyId, EmissionScope scope);
    Optional<EmissionValue> findByCompanyIdAndScopeAndFiscalYear(UUID companyId, EmissionScope scope, Integer fiscalYear);
}
