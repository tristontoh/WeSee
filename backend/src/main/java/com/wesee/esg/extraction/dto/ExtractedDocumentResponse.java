/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.extraction.dto;

import com.wesee.esg.extraction.DocumentTranscription;
import com.wesee.esg.extraction.ExtractedDocument;
import com.wesee.esg.extraction.ExtractionStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ExtractedDocumentResponse(
        UUID id,
        String originalFileName,
        ExtractionStatus status,
        String failureReason,
        String uploadedBy,
        Instant createdAt,
        /** Which model read it — provenance the detail screen shows beside the figures. */
        String modelUsed,
        /** What the document says, as printed. Descriptive; nothing here is reviewed. */
        DocumentTranscription transcription,
        List<ExtractedRecordResponse> records
) {
    public static ExtractedDocumentResponse from(ExtractedDocument document, List<ExtractedRecordResponse> records) {
        return new ExtractedDocumentResponse(
                document.getId(),
                document.getOriginalFileName(),
                document.getStatus(),
                document.getFailureReason(),
                document.getUploadedBy(),
                document.getCreatedAt(),
                document.getModelUsed(),
                document.getTranscription() != null
                        ? document.getTranscription() : DocumentTranscription.empty(),
                records);
    }
}
