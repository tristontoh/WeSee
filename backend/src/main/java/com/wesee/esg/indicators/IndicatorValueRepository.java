/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IndicatorValueRepository extends JpaRepository<IndicatorValue, UUID> {
    Optional<IndicatorValue> findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(UUID companyId, String indicatorDefinitionId, Integer fiscalYear);
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — entering a value
     * would otherwise move that year within the indicator's series. Callers group by indicator,
     * and grouping keeps encounter order, so each indicator's years come out ascending.
     */
    List<IndicatorValue> findByCompanyIdAndIndicatorDefinitionIdInOrderByFiscalYearAsc(UUID companyId, List<String> indicatorDefinitionIds);

    /** Ordered for the same reason as {@link #findByCompanyIdAndIndicatorDefinitionIdInOrderByFiscalYearAsc}. */
    List<IndicatorValue> findByCompanyIdAndIndicatorDefinitionIdOrderByFiscalYearAsc(UUID companyId, String indicatorDefinitionId);
}
