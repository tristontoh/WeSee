/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.materiality;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MaterialityScoreRepository extends JpaRepository<MaterialityScore, UUID> {
    /**
     * Ordered explicitly. An unordered scan gives no guarantee of insertion order, and Postgres
     * reuses whatever tuple slot is free once rows are rewritten. {@code id} breaks ties, since
     * rows written in one transaction can share a timestamp. Scores are saved in the order the
     * heat strip presented the matters, so creation order is the order the user scored them in.
     */
    List<MaterialityScore> findByAssessmentIdOrderByCreatedAtAscIdAsc(UUID assessmentId);
}
