package com.wesee.esg.climate.dto;

import java.util.List;
import java.util.UUID;

public record Scope3CategoryResponse(
        UUID id,
        String name,
        String tooltip,
        Integer standardCategoryNumber,
        boolean mandatory,
        List<Scope3ValuePointDto> values
) {
}
