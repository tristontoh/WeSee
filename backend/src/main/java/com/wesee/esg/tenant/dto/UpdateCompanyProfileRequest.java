/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant.dto;

import com.wesee.esg.tenant.CompanySizeBand;

public record UpdateCompanyProfileRequest(
        String sectorCode,
        CompanySizeBand sizeBand,
        Boolean sectorModuleEnabled
) {
}
