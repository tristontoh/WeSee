package com.wesee.esg.tenant.dto;

import com.wesee.esg.tenant.CompanyType;
import com.wesee.esg.tenant.ListingBoard;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record CreateSubsidiaryRequest(
        @NotBlank String name,
        String sectorCode,

        String registrationNumber,
        String tickerCode,
        LocalDate dateOfIncorporation,
        String countryOfIncorporation,

        ListingBoard listingBoard,
        CompanyType companyType,

        String registeredOfficeAddress,
        String businessAddress,
        String contactPersonName,
        String contactPersonDesignation,
        String contactPersonEmail,
        String contactPersonPhone,
        String taxIdentificationNumber
) {
}
