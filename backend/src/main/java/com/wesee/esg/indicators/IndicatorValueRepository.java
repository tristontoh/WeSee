package com.wesee.esg.indicators;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IndicatorValueRepository extends JpaRepository<IndicatorValue, UUID> {
    Optional<IndicatorValue> findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(UUID companyId, String indicatorDefinitionId, Integer fiscalYear);
    List<IndicatorValue> findByCompanyIdAndIndicatorDefinitionIdIn(UUID companyId, List<String> indicatorDefinitionIds);
    List<IndicatorValue> findByCompanyIdAndIndicatorDefinitionId(UUID companyId, String indicatorDefinitionId);
}
