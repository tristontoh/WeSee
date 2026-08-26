package com.wesee.esg.governance;

import com.wesee.esg.governance.dto.CompliancePolicyResponse;
import com.wesee.esg.governance.dto.CreateCompliancePolicyRequest;
import com.wesee.esg.governance.dto.MarkPolicyReviewedRequest;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/governance/compliance-policies")
@PreAuthorize("@planGate.check('governance')")
public class CompliancePolicyController {

    private final CompliancePolicyService compliancePolicyService;

    public CompliancePolicyController(CompliancePolicyService compliancePolicyService) {
        this.compliancePolicyService = compliancePolicyService;
    }

    @GetMapping
    public List<CompliancePolicyResponse> list() {
        return compliancePolicyService.getPolicies();
    }

    @PostMapping
    @PreAuthorize("@perm.check('governance.manage_policies')")
    public CompliancePolicyResponse createPolicy(@Valid @RequestBody CreateCompliancePolicyRequest request) {
        return compliancePolicyService.createPolicy(request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.check('governance.manage_policies')")
    public ResponseEntity<Void> deletePolicy(@PathVariable UUID id) {
        compliancePolicyService.deletePolicy(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/review")
    @PreAuthorize("@perm.check('governance.manage_policies')")
    public CompliancePolicyResponse markReviewed(@PathVariable UUID id, @RequestBody(required = false) MarkPolicyReviewedRequest request) {
        return compliancePolicyService.markReviewed(id, request != null ? request.documentUrl() : null);
    }
}
