/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.materiality;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MaterialityAssessmentRepository extends JpaRepository<MaterialityAssessment, UUID> {
    List<MaterialityAssessment> findByCompanyIdOrderByAssessmentDateDesc(UUID companyId);
    java.util.Optional<MaterialityAssessment> findByIdAndCompanyId(UUID id, UUID companyId);
}
