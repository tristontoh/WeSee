package com.wesee.esg.tenant;

import com.wesee.esg.tenant.dto.TenantSummaryResponse;
import com.wesee.esg.tenant.dto.UpdateTenantTrialRequest;
import com.wesee.esg.tenant.dto.TenantUserResponse;
import com.wesee.esg.tenant.dto.UpdatePlanRequest;
import com.wesee.esg.tenant.dto.UpdateTenantStatusRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Cross-tenant company management for PLATFORM_ADMIN/SUPERADMIN — lists and modifies any
 * tenant's company record, unlike {@link CompanyController} which is scoped to the caller's own.
 */
@RestController
@RequestMapping("/api/v1/admin/tenants")
@PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'SUPERADMIN')")
public class TenantAdminController {

    private final CompanyService companyService;

    public TenantAdminController(CompanyService companyService) {
        this.companyService = companyService;
    }

    @GetMapping
    public List<TenantSummaryResponse> list() {
        return companyService.listTenants();
    }

    @PatchMapping("/{id}/plan")
    public TenantSummaryResponse updatePlan(@PathVariable UUID id, @Valid @RequestBody UpdatePlanRequest request) {
        return companyService.adminUpdatePlan(id, request);
    }

    @PatchMapping("/{id}/status")
    public TenantSummaryResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateTenantStatusRequest request) {
        return companyService.adminUpdateStatus(id, request);
    }

    @GetMapping("/{id}/users")
    public List<TenantUserResponse> listUsers(@PathVariable UUID id) {
        return companyService.listTenantUsers(id);
    }

    @PatchMapping("/{id}/trial")
    public TenantSummaryResponse updateTrial(@PathVariable UUID id, @Valid @RequestBody UpdateTenantTrialRequest request) {
        return companyService.adminUpdateTrial(id, request);
    }

}
