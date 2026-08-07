package com.wesee.esg.indicators;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TenantIndicatorRepository extends JpaRepository<TenantIndicator, UUID> {
    Optional<TenantIndicator> findByCompanyIdAndIndicatorDefinitionId(UUID companyId, String indicatorDefinitionId);
    List<TenantIndicator> findByCompanyIdAndIndicatorDefinitionIdIn(UUID companyId, List<String> indicatorDefinitionIds);
}
