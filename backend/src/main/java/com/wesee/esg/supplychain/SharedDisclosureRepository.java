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

/**
 * This table is outside the Hibernate tenant filter, so the join to {@code supply_link} and the
 * company-id predicate below ARE the isolation. Every method here binds the acting company. A
 * finder that reads by id alone would be a cross-tenant read with nothing standing in its way —
 * do not add one.
 */
public interface SharedDisclosureRepository extends JpaRepository<SharedDisclosure, UUID> {

    @Query("""
            SELECT d FROM SharedDisclosure d, SupplyLink l
             WHERE l.id = d.supplyLinkId
               AND l.buyerCompanyId = :buyerCompanyId
               AND l.status = com.wesee.esg.supplychain.SupplyLinkStatus.ACTIVE
               AND d.revokedAt IS NULL
             ORDER BY d.fiscalYear DESC, d.publishedAt DESC
            """)
    List<SharedDisclosure> findPublishedForBuyer(@Param("buyerCompanyId") UUID buyerCompanyId);

    @Query("""
            SELECT d FROM SharedDisclosure d, SupplyLink l
             WHERE l.id = d.supplyLinkId
               AND l.supplierCompanyId = :supplierCompanyId
             ORDER BY d.fiscalYear DESC, d.publishedAt DESC
            """)
    List<SharedDisclosure> findForSupplier(@Param("supplierCompanyId") UUID supplierCompanyId);

    @Query("""
            SELECT d FROM SharedDisclosure d, SupplyLink l
             WHERE l.id = d.supplyLinkId
               AND d.id = :id
               AND l.buyerCompanyId = :buyerCompanyId
               AND l.status = com.wesee.esg.supplychain.SupplyLinkStatus.ACTIVE
            """)
    Optional<SharedDisclosure> findByIdForBuyer(@Param("id") UUID id,
                                                @Param("buyerCompanyId") UUID buyerCompanyId);

    @Query("""
            SELECT d FROM SharedDisclosure d, SupplyLink l
             WHERE l.id = d.supplyLinkId
               AND d.id = :id
               AND l.supplierCompanyId = :supplierCompanyId
            """)
    Optional<SharedDisclosure> findByIdForSupplier(@Param("id") UUID id,
                                                   @Param("supplierCompanyId") UUID supplierCompanyId);

    /** The live snapshot for one link and year, if any. Used to supersede it on a republish. */
    @Query("""
            SELECT d FROM SharedDisclosure d
             WHERE d.supplyLinkId = :supplyLinkId
               AND d.fiscalYear = :fiscalYear
               AND d.revokedAt IS NULL
            """)
    Optional<SharedDisclosure> findLiveForLinkAndYear(@Param("supplyLinkId") UUID supplyLinkId,
                                                      @Param("fiscalYear") Integer fiscalYear);

    /** Whether a snapshot newer than this one exists on the same link. Drives the buyer's notice. */
    @Query("""
            SELECT COUNT(d) > 0 FROM SharedDisclosure d, SharedDisclosure older
             WHERE older.id = :disclosureId
               AND d.supplyLinkId = older.supplyLinkId
               AND d.fiscalYear = older.fiscalYear
               AND d.revokedAt IS NULL
               AND d.publishedAt > older.publishedAt
            """)
    boolean existsNewerThan(@Param("disclosureId") UUID disclosureId);
}
