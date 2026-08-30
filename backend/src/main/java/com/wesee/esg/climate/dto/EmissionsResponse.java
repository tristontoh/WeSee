/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate.dto;

import java.util.List;

public record EmissionsResponse(
        List<EmissionPointDto> scope1,
        List<EmissionPointDto> scope2,
        List<Scope3CategoryResponse> scope3
) {
}
