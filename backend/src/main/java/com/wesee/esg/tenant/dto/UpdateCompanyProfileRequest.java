package com.wesee.esg.tenant.dto;

import com.wesee.esg.tenant.CompanySizeBand;

public record UpdateCompanyProfileRequest(
        String sectorCode,
        CompanySizeBand sizeBand,
        Boolean sectorModuleEnabled
) {
}
