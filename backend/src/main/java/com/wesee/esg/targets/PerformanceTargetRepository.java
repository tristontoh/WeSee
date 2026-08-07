package com.wesee.esg.targets;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PerformanceTargetRepository extends JpaRepository<PerformanceTarget, UUID> {
    List<PerformanceTarget> findByCompanyId(UUID companyId);
    Optional<PerformanceTarget> findByIdAndCompanyId(UUID id, UUID companyId);
}
