/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.assurance;

import com.wesee.esg.assurance.dto.CreateSignOffRequest;
import com.wesee.esg.assurance.dto.RevokeSignOffRequest;
import com.wesee.esg.assurance.dto.SignOffAuditEntryResponse;
import com.wesee.esg.assurance.dto.SignOffResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/assurance")
@PreAuthorize("@planGate.check('assurance-workspace')")
public class AssuranceController {

    private final AssuranceService assuranceService;

    public AssuranceController(AssuranceService assuranceService) {
        this.assuranceService = assuranceService;
    }

    @GetMapping("/signoff")
    public List<SignOffResponse> list() {
        return assuranceService.list();
    }

    @GetMapping("/signoff/{fiscalYear}")
    public SignOffResponse get(@PathVariable int fiscalYear) {
        return assuranceService.get(fiscalYear);
    }

    @GetMapping("/signoff/{fiscalYear}/completion")
    public Map<String, Integer> completion(@PathVariable int fiscalYear) {
        return Map.of("completionPercent", assuranceService.completionPercent(fiscalYear));
    }

    @PostMapping("/signoff/{fiscalYear}")
    @PreAuthorize("@perm.check('assurance.signoff')")
    public SignOffResponse signOff(@PathVariable int fiscalYear, @Valid @RequestBody CreateSignOffRequest request) {
        return assuranceService.signOff(fiscalYear, request);
    }

    @DeleteMapping("/signoff/{fiscalYear}")
    @PreAuthorize("@perm.check('assurance.signoff')")
    public SignOffResponse revoke(@PathVariable int fiscalYear, @RequestBody(required = false) RevokeSignOffRequest request) {
        return assuranceService.revoke(fiscalYear, request != null ? request : new RevokeSignOffRequest(null));
    }

    @GetMapping("/signoff/{fiscalYear}/audit-trail")
    public List<SignOffAuditEntryResponse> auditTrail(@PathVariable int fiscalYear) {
        return assuranceService.auditTrail(fiscalYear);
    }
}
