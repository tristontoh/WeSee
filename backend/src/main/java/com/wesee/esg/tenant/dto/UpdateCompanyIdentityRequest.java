package com.wesee.esg.tenant.dto;

import com.wesee.esg.tenant.CompanyType;
import com.wesee.esg.tenant.ListingBoard;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * The corporate identity of one company in the caller's group — the fields a disclosure names the
 * entity by, as opposed to the reporting configuration on {@link UpdateCompanyProfileRequest}.
 *
 * Every field is sent on every save, so a null clears the value rather than leaving it alone. The
 * form behind this shows all of them at once, so a partial-update convention would make "I deleted
 * the ticker code" indistinguishable from "I did not touch the ticker code".
 *
 * The @Size limits match the column widths in V68; without them an over-long value fails as a
 * 500 from the driver rather than a 400 naming the field.
 */
public record UpdateCompanyIdentityRequest(
        @NotBlank @Size(max = 200) String name,

        @Size(max = 100) String registrationNumber,
        @Size(max = 20) String tickerCode,
        @PastOrPresent LocalDate dateOfIncorporation,
        @Size(max = 100) String countryOfIncorporation,

        ListingBoard listingBoard,
        CompanyType companyType,

        @Size(max = 500) String registeredOfficeAddress,
        @Size(max = 500) String businessAddress,
        @Size(max = 200) String contactPersonName,
        @Size(max = 150) String contactPersonDesignation,
        @Email @Size(max = 255) String contactPersonEmail,
        @Size(max = 50) String contactPersonPhone,
        @Size(max = 100) String taxIdentificationNumber
) {
}
