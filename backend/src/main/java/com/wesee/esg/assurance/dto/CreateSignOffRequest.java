package com.wesee.esg.assurance.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateSignOffRequest(
        @NotBlank String signerName,
        @NotBlank String signerTitle,
        String notes,
        String assuranceLevel,
        String externalAssurerName,
        String standardReferenced
) {
}
