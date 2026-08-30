/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.reference.dto;

import com.wesee.esg.tenant.Sector;

public record SectorResponse(String code, String name) {
    public static SectorResponse from(Sector s) {
        return new SectorResponse(s.getCode(), s.getName());
    }
}
