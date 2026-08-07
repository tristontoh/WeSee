package com.wesee.esg.materiality;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MaterialityScoreRepository extends JpaRepository<MaterialityScore, UUID> {
    List<MaterialityScore> findByAssessmentId(UUID assessmentId);
}
