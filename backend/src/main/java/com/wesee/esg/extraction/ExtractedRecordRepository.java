package com.wesee.esg.extraction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExtractedRecordRepository extends JpaRepository<ExtractedRecord, UUID> {

    /** Ordered explicitly: accepting one record must not reshuffle the others under the reviewer. */
    List<ExtractedRecord> findByDocumentIdOrderByCreatedAtAscIdAsc(UUID documentId);

    Optional<ExtractedRecord> findByIdAndCompanyId(UUID id, UUID companyId);

    void deleteByDocumentId(UUID documentId);
}
