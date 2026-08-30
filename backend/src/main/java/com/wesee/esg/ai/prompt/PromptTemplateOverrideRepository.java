/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai.prompt;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromptTemplateOverrideRepository extends JpaRepository<PromptTemplateOverride, UUID> {
    Optional<PromptTemplateOverride> findByCompanyIdAndDraftType(UUID companyId, String draftType);
    List<PromptTemplateOverride> findByCompanyId(UUID companyId);
    void deleteByCompanyIdAndDraftType(UUID companyId, String draftType);
}
