/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.evidence;

import com.wesee.esg.evidence.dto.EvidenceHitResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Suggests documents that might support a written claim.
 *
 * <p>Its own routes, added alongside everything else: with the corpus empty this returns nothing
 * and no other part of the platform behaves differently.
 */
@Tag(name = "Evidence")
@RestController
@RequestMapping("/api/v1/evidence")
public class EvidenceController {

    private final EvidenceSearchService service;

    public EvidenceController(EvidenceSearchService service) {
        this.service = service;
    }

    public record SearchRequest(@NotBlank @Size(max = 2000) String claim) {
    }

    @PostMapping("/search")
    @PreAuthorize("@perm.check('assurance.view')")
    public List<EvidenceHitResponse> search(@RequestBody SearchRequest request) {
        return service.search(request.claim()).stream().map(EvidenceHitResponse::from).toList();
    }

    /** Indexes documents read before this existed. Costs one embedding call per passage. */
    @PostMapping("/reindex")
    // Same right as sealing a period: whoever can sign one off is who should decide the
    // corpus it is checked against, and it spends the operator's own key to build.
    @PreAuthorize("@perm.check('assurance.signoff')")
    public Map<String, Integer> reindex() {
        return Map.of("indexed", service.backfill());
    }
}
