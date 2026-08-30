/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.extraction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExtractedDocumentRepository extends JpaRepository<ExtractedDocument, UUID> {

    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is free,
     * so an unordered scan returns edited rows in a different position — and these rows change
     * status constantly as extraction runs. Newest first: the review queue is worked top-down.
     */
    List<ExtractedDocument> findByCompanyIdOrderByCreatedAtDescIdDesc(UUID companyId);

    Optional<ExtractedDocument> findByIdAndCompanyId(UUID id, UUID companyId);
}
