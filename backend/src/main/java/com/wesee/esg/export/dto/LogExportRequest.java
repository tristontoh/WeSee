/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.export.dto;

import com.wesee.esg.export.ExportFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LogExportRequest(
        @NotBlank String exportType,
        @NotNull ExportFormat format,
        @NotNull Integer fiscalYear
) {
}
