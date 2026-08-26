package com.wesee.esg.extraction;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/**
 * An uploaded source document awaiting, undergoing, or finished with extraction. The file itself
 * stays on local disk; this row carries its status and provenance.
 */
@Entity
@Table(name = "extracted_document")
@Getter
@Setter
@NoArgsConstructor
public class ExtractedDocument extends TenantOwnedEntity {

    @Column(name = "original_file_name", nullable = false, length = 255)
    private String originalFileName;

    @Column(name = "stored_path", nullable = false, length = 500)
    private String storedPath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExtractionStatus status = ExtractionStatus.PENDING;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "uploaded_by", nullable = false, length = 200)
    private String uploadedBy;

    @Column(name = "model_used", length = 100)
    private String modelUsed;

    @Column(name = "extracted_at")
    private Instant extractedAt;

    /**
     * What the document says, as printed. Descriptive only — nothing here is a proposal, so nothing
     * here is accepted or rejected, and it never reaches the assurance hash.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "transcription", columnDefinition = "jsonb")
    private DocumentTranscription transcription;
}
