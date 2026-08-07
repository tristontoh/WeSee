package com.wesee.esg.reference.dto;

import com.wesee.esg.reference.MatterSet;
import com.wesee.esg.reference.SustainabilityMatter;
import com.wesee.esg.reference.SustainabilityMatterCategory;

public record MatterResponse(
        String id,
        String name,
        SustainabilityMatterCategory category,
        String description,
        MatterSet matterSet
) {
    public static MatterResponse from(SustainabilityMatter m) {
        return new MatterResponse(m.getId(), m.getName(), m.getCategory(), m.getDescription(), m.getMatterSet());
    }
}
