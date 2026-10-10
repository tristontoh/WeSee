/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain.dto;

import com.wesee.esg.supplychain.SharedDisclosure;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SharedDisclosureDto(
        UUID id,
        UUID supplyLinkId,
        String counterpartyName,
        Integer fiscalYear,
        BigDecimal scope1Tco2e,
        BigDecimal scope2Tco2e,
        BigDecimal totalTco2e,
        BigDecimal basisQuantity,
        String basisUnit,
        String signOffHash,
        String signerName,
        Instant signedAt,
        Instant publishedAt,
        Instant revokedAt,
        String revocationReason,
        /** True when the supplier has published a newer snapshot for the same year. */
        boolean supersededByNewer,
        List<SharedDisclosureLineDto> lines
) {
    public static SharedDisclosureDto from(SharedDisclosure d, String counterpartyName,
                                           boolean supersededByNewer,
                                           List<SharedDisclosureLineDto> lines) {
        return new SharedDisclosureDto(d.getId(), d.getSupplyLinkId(), counterpartyName,
                d.getFiscalYear(), d.getScope1Tco2e(), d.getScope2Tco2e(),
                d.getScope1Tco2e().add(d.getScope2Tco2e()),
                d.getBasisQuantity(), d.getBasisUnit(), d.getSignOffHash(), d.getSignerName(),
                d.getSignedAt(), d.getPublishedAt(), d.getRevokedAt(), d.getRevocationReason(),
                supersededByNewer, lines);
    }
}
