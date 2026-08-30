/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.governance;

import com.wesee.esg.governance.dto.GovernanceLevelResponse;
import com.wesee.esg.governance.dto.MatterOwnershipResponse;
import com.wesee.esg.governance.dto.UpdateGovernanceLevelRequest;
import com.wesee.esg.governance.dto.UpdateMatterOwnershipRequest;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/governance")
@PreAuthorize("@planGate.check('governance')")
public class GovernanceController {

    private final GovernanceService governanceService;
    private final GovernanceReportService governanceReportService;

    public GovernanceController(GovernanceService governanceService, GovernanceReportService governanceReportService) {
        this.governanceService = governanceService;
        this.governanceReportService = governanceReportService;
    }

    @GetMapping("/report.pdf")
    public ResponseEntity<byte[]> downloadReport() {
        GovernanceReportService.GeneratedReport report = governanceReportService.generateReport();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment().filename(report.filename()).build());
        return ResponseEntity.ok().headers(headers).contentType(MediaType.APPLICATION_PDF).body(report.content());
    }

    @GetMapping("/structure")
    public List<GovernanceLevelResponse> getStructure() {
        return governanceService.getStructure();
    }

    @PutMapping("/structure/{level}")
    @PreAuthorize("@perm.check('governance.edit')")
    public GovernanceLevelResponse updateLevel(@PathVariable OversightLevel level, @Valid @RequestBody UpdateGovernanceLevelRequest request) {
        return governanceService.updateLevel(level, request);
    }

    @GetMapping("/ownership")
    public List<MatterOwnershipResponse> getOwnership() {
        return governanceService.getOwnership();
    }

    @PutMapping("/ownership/{matterId}")
    @PreAuthorize("@perm.check('governance.edit')")
    public MatterOwnershipResponse updateOwnership(@PathVariable String matterId, @Valid @RequestBody UpdateMatterOwnershipRequest request) {
        return governanceService.updateOwnership(matterId, request);
    }
}
