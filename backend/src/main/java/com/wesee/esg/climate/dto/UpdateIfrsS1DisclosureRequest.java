package com.wesee.esg.climate.dto;

import com.wesee.esg.climate.IntegrationLevel;
import com.wesee.esg.climate.ReviewFrequency;

public record UpdateIfrsS1DisclosureRequest(
        String oversightDescription,
        ReviewFrequency reviewFrequency,
        String responsibleCommittee,
        String identificationProcess,
        IntegrationLevel integrationLevel,
        String trackedMetrics,
        String targetsSummary,
        String connectedInformation
) {
}
