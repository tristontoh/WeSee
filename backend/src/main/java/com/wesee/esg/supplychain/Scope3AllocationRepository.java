/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Scope3AllocationRepository extends JpaRepository<Scope3Allocation, UUID> {

    List<Scope3Allocation> findByCompanyIdOrderByFiscalYearDesc(UUID companyId);

    Optional<Scope3Allocation> findByCompanyIdAndSharedDisclosureId(UUID companyId, UUID sharedDisclosureId);

    Optional<Scope3Allocation> findByIdAndCompanyId(UUID id, UUID companyId);
}
