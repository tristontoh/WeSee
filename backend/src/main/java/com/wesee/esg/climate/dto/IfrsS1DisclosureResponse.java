/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate.dto;

import com.wesee.esg.climate.IfrsS1Disclosure;
import com.wesee.esg.climate.IntegrationLevel;
import com.wesee.esg.climate.ReviewFrequency;

public record IfrsS1DisclosureResponse(
        String oversightDescription,
        ReviewFrequency reviewFrequency,
        String responsibleCommittee,
        String identificationProcess,
        IntegrationLevel integrationLevel,
        String trackedMetrics,
        String targetsSummary,
        String connectedInformation
) {
    public static IfrsS1DisclosureResponse from(IfrsS1Disclosure d) {
        return new IfrsS1DisclosureResponse(
                d.getOversightDescription(), d.getReviewFrequency(), d.getResponsibleCommittee(),
                d.getIdentificationProcess(), d.getIntegrationLevel(),
                d.getTrackedMetrics(), d.getTargetsSummary(), d.getConnectedInformation()
        );
    }
}
