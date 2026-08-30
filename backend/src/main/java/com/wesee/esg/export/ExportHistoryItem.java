/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.export;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Append-only log of generated exports (SRS FR-8.x) — this is a readiness/logging record, not the file itself. */
@Entity
@Table(name = "export_history_item")
@Getter
@Setter
@NoArgsConstructor
public class ExportHistoryItem extends TenantOwnedEntity {

    @Column(name = "export_type", nullable = false, length = 100)
    private String exportType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ExportFormat format;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(name = "generated_by_name", length = 200)
    private String generatedByName;

    @Column(name = "signed_off_by_name", length = 200)
    private String signedOffByName;

    @Column(name = "signed_off_at")
    private java.time.Instant signedOffAt;
}
