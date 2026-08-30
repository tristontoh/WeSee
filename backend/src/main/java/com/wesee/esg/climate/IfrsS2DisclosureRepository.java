/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface IfrsS2DisclosureRepository extends JpaRepository<IfrsS2Disclosure, UUID> {
    Optional<IfrsS2Disclosure> findByCompanyId(UUID companyId);
}
