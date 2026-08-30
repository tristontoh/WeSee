/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators;

import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.reference.IndicatorDefinition;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Append-only audit trail per indicator value change (SRS FR-5.5 / FR-7.2): who, when (via the
 * inherited {@code createdAt}), and an optional source-document reference.
 */
@Entity
@Table(name = "indicator_audit_entry")
@Getter
@Setter
@NoArgsConstructor
public class IndicatorAuditEntry extends TenantOwnedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "indicator_definition_id", nullable = false)
    private IndicatorDefinition indicatorDefinition;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    /** Null for an annual correction (today's behavior); 1-12 for a correction to one month's entry. */
    @Column
    private Integer month;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal value;

    @Column(name = "entered_by", nullable = false, length = 200)
    private String enteredBy;

    @Column(name = "source_doc_name", length = 255)
    private String sourceDocName;

    /** Server-generated storage path for the uploaded evidence file (see IndicatorEvidenceController) — distinct from sourceDocName, which is just the original filename for display. */
    @Column(name = "source_doc_path", length = 500)
    private String sourceDocPath;

    /** 1-based page of the source document; null when unknown or the document has no pages. */
    @Column(name = "source_page")
    private Integer sourcePage;

    /** The sentence the figure was read from, verbatim. */
    @Column(name = "source_quote", columnDefinition = "text")
    private String sourceQuote;

    @Column(columnDefinition = "TEXT")
    private String comment;
}
