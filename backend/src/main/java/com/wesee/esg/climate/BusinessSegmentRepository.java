package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BusinessSegmentRepository extends JpaRepository<BusinessSegment, UUID> {
    List<BusinessSegment> findByCompanyId(UUID companyId);
    Optional<BusinessSegment> findByIdAndCompanyId(UUID id, UUID companyId);
    boolean existsByCompanyIdAndNameIgnoreCase(UUID companyId, String name);
    boolean existsByCompanyId(UUID companyId);
}
