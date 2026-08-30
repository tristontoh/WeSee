/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.materiality.dto;

import com.wesee.esg.materiality.MaterialityScore;
import com.wesee.esg.reference.SustainabilityMatterCategory;

public record ScoreResponse(
        String matterId,
        String matterName,
        SustainabilityMatterCategory category,
        int impact,
        int influence,
        String rationale,
        String priorityTier
) {
    public static ScoreResponse from(MaterialityScore score) {
        int impact = score.getImpact();
        int influence = score.getInfluence();
        String tier = priorityTier(impact, influence);
        return new ScoreResponse(score.getMatter().getId(), score.getMatter().getName(), score.getMatter().getCategory(), impact, influence, score.getRationale(), tier);
    }

    private static String priorityTier(int impact, int influence) {
        if (impact >= 4 && influence >= 4) {
            return "High Priority";
        }
        double average = (impact + influence) / 2.0;
        if (average >= 3.0) {
            return "Medium Priority";
        }
        return "Low Priority";
    }
}
