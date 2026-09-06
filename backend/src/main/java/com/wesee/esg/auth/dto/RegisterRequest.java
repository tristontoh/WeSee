/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.auth.dto;

import com.wesee.esg.tenant.CompanySizeBand;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") String password,
        @NotBlank String companyName,

        /**
         * The company's SSM registration number. Required, and unique across the platform — see
         * SsmRegistrationNumber for the format, and AuthService.register for what happens when two
         * people claim the same one. Format is checked in the service rather than by an annotation
         * so the error can name the actual problem instead of "must match \"^\d{12}$\"".
         */
        @NotBlank String registrationNumber,

        /**
         * Both optional, and both already collected by the signup wizard — which until now sent
         * neither, so a person answered two questions and the answers went nowhere.
         */
        CompanySizeBand sizeBand,

        @Size(max = 100) String countryOfIncorporation
) {
}
