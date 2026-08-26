package com.wesee.esg.tenant.dto;

import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyType;
import com.wesee.esg.tenant.ListingBoard;
import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.SubscriptionPlan;

import java.time.LocalDate;
import java.util.UUID;

public record CompanyGroupMemberResponse(
        UUID id,
        String name,
        String sectorCode,
        MarketClassification marketClassification,
        SubscriptionPlan subscriptionPlan,
        boolean current,

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
    public static CompanyGroupMemberResponse from(Company c, boolean current) {
        return new CompanyGroupMemberResponse(
                c.getId(), c.getName(), c.getSector() != null ? c.getSector().getCode() : null,
                c.getMarketClassification(), c.getSubscriptionPlan(), current,
                c.getRegistrationNumber(), c.getTickerCode(), c.getDateOfIncorporation(), c.getCountryOfIncorporation(),
                c.getListingBoard(), c.getCompanyType(),
                c.getRegisteredOfficeAddress(), c.getBusinessAddress(), c.getContactPersonName(),
                c.getContactPersonDesignation(), c.getContactPersonEmail(), c.getContactPersonPhone(),
                c.getTaxIdentificationNumber()
        );
    }
}
