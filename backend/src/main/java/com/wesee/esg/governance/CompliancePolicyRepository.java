/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.governance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompliancePolicyRepository extends JpaRepository<CompliancePolicy, UUID> {
    /**
     * Ordered explicitly — without it "Mark reviewed" bumped the row to the end of the list,
     * because an unordered scan follows heap order and an update relocates the tuple.
     * Mandatory policies lead, since those are the ones Bursa requires; "mandatory" is not a
     * column, it is {@code policyKey != null}, hence the CASE rather than a derived query.
     */
    @Query("""
            select p from CompliancePolicy p
            where p.companyId = :companyId
            order by case when p.policyKey is null then 1 else 0 end, p.name
            """)
    List<CompliancePolicy> findByCompanyIdOrdered(@Param("companyId") UUID companyId);

    Optional<CompliancePolicy> findByIdAndCompanyId(UUID id, UUID companyId);

    Optional<CompliancePolicy> findByCompanyIdAndPolicyKey(UUID companyId, String policyKey);
}
