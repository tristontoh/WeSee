package com.wesee.esg.materiality;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MaterialityStakeholderSnapshotRepository extends JpaRepository<MaterialityStakeholderSnapshot, UUID> {
    List<MaterialityStakeholderSnapshot> findByAssessmentIdOrderBySortOrder(UUID assessmentId);
}
