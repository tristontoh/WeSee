package com.wesee.esg.reference.dto;

import com.wesee.esg.reference.MatterSet;
import com.wesee.esg.reference.SustainabilityMatterCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MatterUpsertRequest(
        @NotBlank String id,
        @NotBlank String name,
        @NotNull SustainabilityMatterCategory category,
        String description,
        @NotNull MatterSet matterSet
) {
}
