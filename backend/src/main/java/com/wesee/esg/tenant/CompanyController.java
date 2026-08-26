package com.wesee.esg.tenant;

import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.dto.CompanyGroupMemberResponse;
import com.wesee.esg.tenant.dto.CompanyResponse;
import com.wesee.esg.tenant.dto.CreateSubsidiaryRequest;
import com.wesee.esg.tenant.dto.CreateTenantUserRequest;
import com.wesee.esg.tenant.dto.CreateTenantUserResponse;
import com.wesee.esg.tenant.dto.TeamInviteResponse;
import com.wesee.esg.tenant.dto.TenantUserResponse;
import com.wesee.esg.tenant.dto.UpdateCompanyIdentityRequest;
import com.wesee.esg.tenant.dto.UpdateCompanyProfileRequest;
import com.wesee.esg.tenant.dto.UpdatePlanRequest;
import com.wesee.esg.tenant.dto.UpdateUserRoleRequest;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/company")
public class CompanyController {

    private final CompanyService companyService;
    private final CurrentUserProvider currentUserProvider;

    public CompanyController(CompanyService companyService, CurrentUserProvider currentUserProvider) {
        this.companyService = companyService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    public CompanyResponse get() {
        return companyService.getCurrent();
    }

    /** Real company user list — used e.g. to populate an "Authorizing Officer" picker on indicator entries. */
    @GetMapping("/users")
    public List<TenantUserResponse> listUsers() {
        return companyService.listTenantUsers(currentUserProvider.requireCompanyId());
    }

    @PatchMapping("/plan")
    @PreAuthorize("@perm.check('billing.manage')")
    public CompanyResponse updatePlan(@Valid @RequestBody UpdatePlanRequest request) {
        return companyService.updatePlan(request);
    }

    /**
     * Reporting configuration: which sector applies, the size band, whether the sector module is on.
     * `indicators.edit` is accepted because the sector-module switch lives on the Indicators screen
     * and the default Member role is expected to work it; the identity fields below are not on this
     * endpoint precisely so that they need the stricter permission.
     */
    @PatchMapping("/profile")
    @PreAuthorize("@perm.check('settings.manage') or @perm.check('indicators.edit')")
    public CompanyResponse updateProfile(@Valid @RequestBody UpdateCompanyProfileRequest request) {
        return companyService.updateProfile(request);
    }

    /** Corporate identity — the registration number, addresses and contact a disclosure names. */
    @PatchMapping("/{companyId}/identity")
    @PreAuthorize("@perm.check('settings.manage')")
    public CompanyGroupMemberResponse updateIdentity(@PathVariable UUID companyId,
                                                     @Valid @RequestBody UpdateCompanyIdentityRequest request) {
        return companyService.updateIdentity(companyId, request);
    }

    @GetMapping("/group")
    @PreAuthorize("@perm.check('settings.view') or @perm.check('settings.manage')")
    public List<CompanyGroupMemberResponse> group() {
        return companyService.getGroup();
    }

    @PostMapping("/subsidiaries")
    @PreAuthorize("@perm.check('settings.manage')")
    public CompanyGroupMemberResponse createSubsidiary(@Valid @RequestBody CreateSubsidiaryRequest request) {
        return companyService.createSubsidiary(request);
    }

    @PostMapping("/switch/{companyId}")
    @PreAuthorize("@perm.check('settings.manage')")
    public CompanyGroupMemberResponse switchCompany(@PathVariable UUID companyId) {
        return companyService.switchCompany(companyId);
    }

    @DeleteMapping("/subsidiaries/{companyId}")
    @PreAuthorize("@perm.check('settings.manage')")
    public ResponseEntity<Void> deleteSubsidiary(@PathVariable UUID companyId) {
        companyService.deleteSubsidiary(companyId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users")
    @PreAuthorize("@perm.check('team.manage')")
    public CreateTenantUserResponse createUser(@Valid @RequestBody CreateTenantUserRequest request) {
        return companyService.createUser(request);
    }

    @PatchMapping("/users/{userId}/role")
    @PreAuthorize("@perm.check('team.manage')")
    public TenantUserResponse updateUserRole(@PathVariable UUID userId, @Valid @RequestBody UpdateUserRoleRequest request) {
        return companyService.updateUserRole(userId, request);
    }

    @PatchMapping("/users/{userId}/active")
    @PreAuthorize("@perm.check('team.manage')")
    public TenantUserResponse setUserActive(@PathVariable UUID userId, @RequestParam boolean active) {
        return companyService.setUserActive(userId, active);
    }

    /*
     * team.manage, not team.view. The response embeds each pending invite's accept URL, which
     * contains the raw token, and POST /auth/invites/{token}/accept is deliberately unauthenticated
     * — so read access here is enough to claim somebody else's pending COMPANY_ADMIN invite before
     * they do. V57's default Member role grants team.view to every backfilled contributor.
     */
    @GetMapping("/invites")
    @PreAuthorize("@perm.check('team.manage')")
    public List<TeamInviteResponse> listInvites() {
        return companyService.listInvites();
    }

    @PostMapping("/invites")
    @PreAuthorize("@perm.check('team.manage')")
    public TeamInviteResponse createInvite(@Valid @RequestBody CreateTenantUserRequest request) {
        return companyService.createInvite(request);
    }

    @PostMapping("/invites/{inviteId}/resend")
    @PreAuthorize("@perm.check('team.manage')")
    public TeamInviteResponse resendInvite(@PathVariable UUID inviteId) {
        return companyService.resendInvite(inviteId);
    }

    @DeleteMapping("/invites/{inviteId}")
    @PreAuthorize("@perm.check('team.manage')")
    public ResponseEntity<Void> revokeInvite(@PathVariable UUID inviteId) {
        companyService.revokeInvite(inviteId);
        return ResponseEntity.noContent().build();
    }
}
