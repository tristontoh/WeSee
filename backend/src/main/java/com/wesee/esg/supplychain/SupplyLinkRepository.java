/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Every method declared here names the acting company. {@code findById} is inherited from
 * {@link JpaRepository} and cannot be removed — never call it with an id that came from a request.
 * This table is outside the tenant filter, so an id-only lookup on request input would be a
 * cross-tenant read with nothing standing in its way.
 */
public interface SupplyLinkRepository extends JpaRepository<SupplyLink, UUID> {

    List<SupplyLink> findByBuyerCompanyIdOrderByInvitedAtDesc(UUID buyerCompanyId);

    List<SupplyLink> findBySupplierCompanyIdOrderByInvitedAtDesc(UUID supplierCompanyId);

    Optional<SupplyLink> findByIdAndBuyerCompanyId(UUID id, UUID buyerCompanyId);

    Optional<SupplyLink> findByIdAndSupplierCompanyId(UUID id, UUID supplierCompanyId);

    /** The one finder without a company id, because accepting an invite is how a company joins. */
    Optional<SupplyLink> findByInviteTokenHash(String inviteTokenHash);

    boolean existsByBuyerCompanyIdAndSupplierCompanyIdAndStatus(
            UUID buyerCompanyId, UUID supplierCompanyId, SupplyLinkStatus status);
}
