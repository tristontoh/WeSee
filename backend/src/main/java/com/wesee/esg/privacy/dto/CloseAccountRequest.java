package com.wesee.esg.privacy.dto;

import jakarta.validation.constraints.NotBlank;

/** confirmCompanyName must match the company's exact current name — a type-to-confirm guard
 *  against closing the account by accident, mirrored on the frontend confirmation modal. */
public record CloseAccountRequest(
        @NotBlank String confirmCompanyName
) {
}
