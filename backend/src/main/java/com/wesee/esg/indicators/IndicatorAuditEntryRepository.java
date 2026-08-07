package com.wesee.esg.indicators;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IndicatorAuditEntryRepository extends JpaRepository<IndicatorAuditEntry, UUID> {
    List<IndicatorAuditEntry> findByCompanyIdAndIndicatorDefinitionIdOrderByCreatedAtDesc(UUID companyId, String indicatorDefinitionId);
    List<IndicatorAuditEntry> findByCompanyIdAndIndicatorDefinitionIdInOrderByCreatedAtDesc(UUID companyId, List<String> indicatorDefinitionIds);
    Optional<IndicatorAuditEntry> findByIdAndCompanyId(UUID id, UUID companyId);
}
