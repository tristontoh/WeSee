/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate.dto;

import com.wesee.esg.climate.BusinessSegment;

import java.util.List;
import java.util.UUID;

public record BusinessSegmentResponse(UUID id, String name, List<S1ItemResponse> items) {
    public static BusinessSegmentResponse from(BusinessSegment segment, List<S1ItemResponse> items) {
        return new BusinessSegmentResponse(segment.getId(), segment.getName(), items);
    }
}
