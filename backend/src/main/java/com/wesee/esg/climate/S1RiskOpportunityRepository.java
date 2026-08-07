package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface S1RiskOpportunityRepository extends JpaRepository<S1RiskOpportunity, UUID> {
    List<S1RiskOpportunity> findByCompanyId(UUID companyId);
    List<S1RiskOpportunity> findBySegmentId(UUID segmentId);
    Optional<S1RiskOpportunity> findByIdAndCompanyId(UUID id, UUID companyId);
    void deleteBySegmentId(UUID segmentId);
}
