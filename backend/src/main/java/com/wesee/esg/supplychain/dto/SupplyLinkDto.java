/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain.dto;

import com.wesee.esg.supplychain.SupplyLink;
import com.wesee.esg.supplychain.SupplyLinkStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * One link, told from the acting company's side. A company is a buyer to its suppliers and a
 * supplier to its buyers, often on the same day, so the counterparty depends on which role you
 * are reading it in.
 */
public record SupplyLinkDto(
        UUID id,
        String counterpartyName,
        String counterpartyEmail,
        SupplyLinkStatus status,
        Instant invitedAt,
        Instant respondedAt,
        boolean actingAsBuyer
) {
    public static SupplyLinkDto asBuyer(SupplyLink l, String supplierCompanyName) {
        return new SupplyLinkDto(l.getId(),
                supplierCompanyName != null ? supplierCompanyName : l.getSupplierName(),
                l.getSupplierEmail(), l.getStatus(), l.getInvitedAt(), l.getRespondedAt(), true);
    }

    public static SupplyLinkDto asSupplier(SupplyLink l, String buyerCompanyName) {
        return new SupplyLinkDto(l.getId(), buyerCompanyName, null,
                l.getStatus(), l.getInvitedAt(), l.getRespondedAt(), false);
    }
}
