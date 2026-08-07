package com.wesee.esg.governance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GovernanceLevelRepository extends JpaRepository<GovernanceLevel, UUID> {
    List<GovernanceLevel> findByCompanyId(UUID companyId);
    Optional<GovernanceLevel> findByCompanyIdAndLevel(UUID companyId, OversightLevel level);
}
