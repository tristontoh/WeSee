/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.reference;

import com.wesee.esg.reference.dto.FeatureFlagResponse;
import com.wesee.esg.reference.dto.IndicatorDefinitionResponse;
import com.wesee.esg.reference.dto.IndicatorDefinitionUpsertRequest;
import com.wesee.esg.reference.dto.MatterResponse;
import com.wesee.esg.reference.dto.MatterUpsertRequest;
import com.wesee.esg.reference.dto.UpdateFeatureFlagRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Reference-data management for PLATFORM_ADMIN/SUPERADMIN — lets matter/indicator definitions be
 * updated as SEDG/Bursa frameworks evolve, without a code redeploy (SRS maintainability NFR).
 */
@RestController
@RequestMapping("/api/v1/admin/reference")
@PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'SUPERADMIN')")
public class ReferenceAdminController {

    private final ReferenceService referenceService;

    public ReferenceAdminController(ReferenceService referenceService) {
        this.referenceService = referenceService;
    }

    @PostMapping("/matters")
    public ResponseEntity<MatterResponse> upsertMatter(@Valid @RequestBody MatterUpsertRequest request) {
        return ResponseEntity.ok(referenceService.upsertMatter(request));
    }

    @DeleteMapping("/matters/{id}")
    public ResponseEntity<Void> deleteMatter(@PathVariable String id) {
        referenceService.deleteMatter(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/indicators")
    public ResponseEntity<IndicatorDefinitionResponse> upsertIndicator(@Valid @RequestBody IndicatorDefinitionUpsertRequest request) {
        return ResponseEntity.ok(referenceService.upsertIndicator(request));
    }

    @DeleteMapping("/indicators/{id}")
    public ResponseEntity<Void> deleteIndicator(@PathVariable String id) {
        referenceService.deleteIndicator(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/features")
    public List<FeatureFlagResponse> listFeatures() {
        return referenceService.listFeatureFlags();
    }

    @PatchMapping("/features/{key}")
    public FeatureFlagResponse updateFeature(@PathVariable String key, @Valid @RequestBody UpdateFeatureFlagRequest request) {
        return referenceService.updateFeatureFlag(key, request);
    }
}
