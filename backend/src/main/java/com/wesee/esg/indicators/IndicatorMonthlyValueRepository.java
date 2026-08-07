package com.wesee.esg.indicators;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IndicatorMonthlyValueRepository extends JpaRepository<IndicatorMonthlyValue, UUID> {
    Optional<IndicatorMonthlyValue> findByCompanyIdAndIndicatorDefinitionIdAndFiscalYearAndMonth(
            UUID companyId, String indicatorDefinitionId, Integer fiscalYear, Integer month);
    List<IndicatorMonthlyValue> findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(
            UUID companyId, String indicatorDefinitionId, Integer fiscalYear);
    List<IndicatorMonthlyValue> findByCompanyIdAndIndicatorDefinitionIdIn(UUID companyId, List<String> indicatorDefinitionIds);
}
