/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Scope3AllocationRepository extends JpaRepository<Scope3Allocation, UUID> {

    List<Scope3Allocation> findByCompanyIdOrderByFiscalYearDesc(UUID companyId);

    Optional<Scope3Allocation> findByCompanyIdAndSharedDisclosureId(UUID companyId, UUID sharedDisclosureId);

    /**
     * The buyer's allocation for one supplier relationship and year, whichever snapshot it was
     * drawn from. Keying on the snapshot instead let a republish — which creates a new
     * shared_disclosure id — produce a second allocation for the same purchase.
     */
    @Query("""
            SELECT a FROM Scope3Allocation a, SharedDisclosure d
             WHERE d.id = a.sharedDisclosureId
               AND a.companyId = :companyId
               AND d.supplyLinkId = :supplyLinkId
               AND a.fiscalYear = :fiscalYear
            """)
    Optional<Scope3Allocation> findForLinkAndYear(@Param("companyId") UUID companyId,
                                                  @Param("supplyLinkId") UUID supplyLinkId,
                                                  @Param("fiscalYear") Integer fiscalYear);

    Optional<Scope3Allocation> findByIdAndCompanyId(UUID id, UUID companyId);
}
