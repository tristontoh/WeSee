/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.export.dto;

import com.wesee.esg.export.ExportFormat;
import com.wesee.esg.export.ExportHistoryItem;

import java.time.Instant;
import java.util.UUID;

public record ExportHistoryResponse(
        UUID id,
        Instant generatedAt,
        String exportType,
        ExportFormat format,
        int fiscalYear,
        String generatedByName,
        String signedOffByName,
        Instant signedOffAt
) {
    public static ExportHistoryResponse from(ExportHistoryItem item) {
        return new ExportHistoryResponse(item.getId(), item.getCreatedAt(), item.getExportType(), item.getFormat(), item.getFiscalYear(), item.getGeneratedByName(), item.getSignedOffByName(), item.getSignedOffAt());
    }
}
