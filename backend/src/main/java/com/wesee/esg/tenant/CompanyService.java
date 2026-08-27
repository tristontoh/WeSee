package com.wesee.esg.tenant;

import com.wesee.esg.activitylog.ActivityEventType;
import com.wesee.esg.activitylog.PlatformActivityLogService;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.email.EmailService;
import com.wesee.esg.permission.CustomRole;
import com.wesee.esg.permission.CustomRoleService;
import com.wesee.esg.platform.PlatformSettingsService;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.dto.CompanyGroupMemberResponse;
import com.wesee.esg.tenant.dto.CompanyResponse;
import com.wesee.esg.tenant.dto.CreateSubsidiaryRequest;
import com.wesee.esg.tenant.dto.CreateTenantUserRequest;
import com.wesee.esg.tenant.dto.CreateTenantUserResponse;
import com.wesee.esg.tenant.dto.TeamInviteResponse;
import com.wesee.esg.tenant.dto.TenantSummaryResponse;
import com.wesee.esg.tenant.dto.TenantUserResponse;
import com.wesee.esg.tenant.dto.UpdateCompanyIdentityRequest;
import com.wesee.esg.tenant.dto.UpdateTenantTrialRequest;
import com.wesee.esg.tenant.dto.UpdateCompanyProfileRequest;
import com.wesee.esg.tenant.dto.UpdatePlanRequest;
import com.wesee.esg.tenant.dto.UpdateTenantStatusRequest;
import com.wesee.esg.tenant.dto.UpdateUserRoleRequest;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import com.wesee.esg.user.Role;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class CompanyService {

    private static final int INVITE_VALIDITY_DAYS = 7;

    private final CompanyRepository companyRepository;
    private final SectorRepository sectorRepository;
    private final AppUserRepository appUserRepository;
    private final TeamInviteRepository teamInviteRepository;
    private final CurrentUserProvider currentUserProvider;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final PlatformSettingsService platformSettingsService;
    private final CustomRoleService customRoleService;
    private final PlatformActivityLogService activityLogService;
    private final SecureRandom random = new SecureRandom();

    public CompanyService(CompanyRepository companyRepository, SectorRepository sectorRepository,
                           AppUserRepository appUserRepository, TeamInviteRepository teamInviteRepository,
                           CurrentUserProvider currentUserProvider, PasswordEncoder passwordEncoder,
                           EmailService emailService, PlatformSettingsService platformSettingsService,
                           CustomRoleService customRoleService,
                           PlatformActivityLogService activityLogService) {
        this.companyRepository = companyRepository;
        this.sectorRepository = sectorRepository;
        this.appUserRepository = appUserRepository;
        this.teamInviteRepository = teamInviteRepository;
        this.currentUserProvider = currentUserProvider;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.platformSettingsService = platformSettingsService;
        this.customRoleService = customRoleService;
        this.activityLogService = activityLogService;
    }

    /**
     * Resolves the custom role to assign for a given target role, enforcing the invariant that
     * custom roles fully replace any implicit COMPANY_CONTRIBUTOR/CONSULTANT permission set:
     * COMPANY_ADMIN never has one (implicitly all-permissions, see PermissionGateService), every
     * other tenant role must have one, resolved against the caller's own company.
     */
    private CustomRole resolveCustomRole(Role role, UUID customRoleId) {
        if (role == Role.COMPANY_ADMIN) {
            return null;
        }
        if (customRoleId == null) {
            throw new IllegalArgumentException("A custom role is required for non-admin users");
        }
        return customRoleService.requireOwnedRole(customRoleId);
    }

    /**
     * Lockout-prevention safety net: a company must always retain at least one active
     * COMPANY_ADMIN able to manage it. Called before demoting or deactivating one.
     */
    private void requireNotLastActiveAdmin(UUID companyId, AppUser target) {
        if (target.getRole() != Role.COMPANY_ADMIN || !Boolean.TRUE.equals(target.getActive())) {
            return;
        }
        if (appUserRepository.countByCompanyIdAndRoleAndActiveTrue(companyId, Role.COMPANY_ADMIN) <= 1) {
            throw new ConflictException("Cannot remove the last admin — promote another user to Company Admin first");
        }
    }

    @Transactional(readOnly = true)
    public CompanyResponse getCurrent() {
        return CompanyResponse.from(currentCompany());
    }

    @Transactional
    public CompanyResponse updatePlan(UpdatePlanRequest request) {
        Company company = currentCompany();
        SubscriptionPlan previousPlan = company.getSubscriptionPlan();
        company.setSubscriptionPlan(request.plan());
        CompanyResponse response = CompanyResponse.from(companyRepository.save(company));
        logPlanChange(company, previousPlan, request.plan());
        return response;
    }

    @Transactional
    public CompanyResponse updateProfile(UpdateCompanyProfileRequest request) {
        Company company = currentCompany();

        if (request.sectorCode() != null && !request.sectorCode().isBlank()) {
            Sector sector = sectorRepository.findById(request.sectorCode())
                    .orElseThrow(() -> new NotFoundException("Unknown sector code: " + request.sectorCode()));
            company.setSector(sector);
        }
        if (request.sizeBand() != null) {
            company.setSizeBand(request.sizeBand());
        }
        if (request.sectorModuleEnabled() != null) {
            company.setSectorModuleEnabled(request.sectorModuleEnabled());
        }

        return CompanyResponse.from(companyRepository.save(company));
    }

    private Company currentCompany() {
        return companyRepository.findById(currentUserProvider.requireCompanyId())
                .orElseThrow(() -> new NotFoundException("Company not found"));
    }

    /**
     * Marks a trial as converted to paid. Manual on purpose: payment can arrive by bank transfer or
     * an invoice settled offline, so the flag is an operator's statement of fact rather than
     * something inferred from Stripe alone.
     */
    @Transactional
    public TenantSummaryResponse adminUpdateTrial(UUID companyId, UpdateTenantTrialRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));
        boolean wasConverted = Boolean.TRUE.equals(company.getTrialConverted());
        company.setTrialConverted(request.converted());
        company = companyRepository.save(company);
        if (Boolean.TRUE.equals(request.converted()) && !wasConverted) {
            activityLogService.record(company.getId(), company.getName(), ActivityEventType.TRIAL_CONVERTED,
                    "Trial manually marked as converted to paid");
        } else if (!Boolean.TRUE.equals(request.converted()) && wasConverted) {
            activityLogService.record(company.getId(), company.getName(), ActivityEventType.TRIAL_REVOKED,
                    "Trial conversion was taken back");
        }
        return toSummary(company);
    }

    private Company groupRoot(Company company) {
        return company.getParentCompany() != null ? company.getParentCompany() : company;
    }

    @Transactional(readOnly = true)
    public List<CompanyGroupMemberResponse> getGroup() {
        UUID currentCompanyId = currentUserProvider.requireCompanyId();
        Company root = groupRoot(currentCompany());
        List<Company> members = new java.util.ArrayList<>();
        members.add(root);
        members.addAll(companyRepository.findByParentCompanyIdOrderByCreatedAtAscIdAsc(root.getId()));
        return members.stream()
                .map(c -> CompanyGroupMemberResponse.from(c, c.getId().equals(currentCompanyId)))
                .toList();
    }

    @Transactional
    public CompanyGroupMemberResponse createSubsidiary(CreateSubsidiaryRequest request) {
        Company root = groupRoot(currentCompany());

        Company subsidiary = new Company();
        subsidiary.setName(request.name());
        subsidiary.setMarketClassification(root.getMarketClassification());
        subsidiary.setSubscriptionPlan(root.getSubscriptionPlan());
        subsidiary.setFiscalYearEndMonth(root.getFiscalYearEndMonth());
        subsidiary.setSectorModuleEnabled(root.getSectorModuleEnabled());
        subsidiary.setOnboardingCompleted(true);
        subsidiary.setActive(true);
        subsidiary.setParentCompany(root);

        if (request.sectorCode() != null && !request.sectorCode().isBlank()) {
            Sector sector = sectorRepository.findById(request.sectorCode())
                    .orElseThrow(() -> new NotFoundException("Unknown sector code: " + request.sectorCode()));
            subsidiary.setSector(sector);
        }

        subsidiary.setRegistrationNumber(request.registrationNumber());
        subsidiary.setTickerCode(request.tickerCode());
        subsidiary.setDateOfIncorporation(request.dateOfIncorporation());
        subsidiary.setCountryOfIncorporation(request.countryOfIncorporation());
        subsidiary.setListingBoard(request.listingBoard());
        subsidiary.setCompanyType(request.companyType());
        subsidiary.setRegisteredOfficeAddress(request.registeredOfficeAddress());
        subsidiary.setBusinessAddress(request.businessAddress());
        subsidiary.setContactPersonName(request.contactPersonName());
        subsidiary.setContactPersonDesignation(request.contactPersonDesignation());
        subsidiary.setContactPersonEmail(request.contactPersonEmail());
        subsidiary.setContactPersonPhone(request.contactPersonPhone());
        subsidiary.setTaxIdentificationNumber(request.taxIdentificationNumber());

        subsidiary = companyRepository.save(subsidiary);

        return CompanyGroupMemberResponse.from(subsidiary, false);
    }

    /**
     * Edits the corporate identity of any company in the caller's own group, the root included —
     * a name typed wrong at signup has to be fixable, and only the root has that problem.
     *
     * A company outside the group is reported as not found rather than forbidden: whether a given
     * UUID exists is not something one tenant should be able to learn about another.
     */
    @Transactional
    public CompanyGroupMemberResponse updateIdentity(UUID targetCompanyId, UpdateCompanyIdentityRequest request) {
        Company target = companyRepository.findById(targetCompanyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));
        Company root = groupRoot(currentCompany());
        if (!groupRoot(target).getId().equals(root.getId())) {
            throw new NotFoundException("Company not found");
        }

        target.setName(request.name().trim());
        target.setRegistrationNumber(blankToNull(request.registrationNumber()));
        target.setTickerCode(blankToNull(request.tickerCode()));
        target.setDateOfIncorporation(request.dateOfIncorporation());
        target.setCountryOfIncorporation(blankToNull(request.countryOfIncorporation()));
        target.setListingBoard(request.listingBoard());
        target.setCompanyType(request.companyType());
        target.setRegisteredOfficeAddress(blankToNull(request.registeredOfficeAddress()));
        target.setBusinessAddress(blankToNull(request.businessAddress()));
        target.setContactPersonName(blankToNull(request.contactPersonName()));
        target.setContactPersonDesignation(blankToNull(request.contactPersonDesignation()));
        target.setContactPersonEmail(blankToNull(request.contactPersonEmail()));
        target.setContactPersonPhone(blankToNull(request.contactPersonPhone()));
        target.setTaxIdentificationNumber(blankToNull(request.taxIdentificationNumber()));

        Company saved = companyRepository.save(target);
        return CompanyGroupMemberResponse.from(saved, saved.getId().equals(currentUserProvider.requireCompanyId()));
    }

    /** A cleared form field arrives as "", which should read as absent rather than as an empty value. */
    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @Transactional
    public CompanyGroupMemberResponse switchCompany(UUID targetCompanyId) {
        Company target = companyRepository.findById(targetCompanyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));
        Company root = groupRoot(currentCompany());
        if (!groupRoot(target).getId().equals(root.getId())) {
            throw new NotFoundException("Company not found");
        }

        AppUser me = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        me.setCompany(target);
        appUserRepository.save(me);

        return CompanyGroupMemberResponse.from(target, true);
    }

    @Transactional
    public void deleteSubsidiary(UUID companyId) {
        Company target = companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));
        Company root = groupRoot(currentCompany());
        if (target.getParentCompany() == null || !groupRoot(target).getId().equals(root.getId())) {
            throw new NotFoundException("Company not found");
        }
        if (!appUserRepository.findByCompanyIdOrderByCreatedAtAscIdAsc(companyId).isEmpty()) {
            throw new ConflictException("Cannot delete a company with users still assigned to it — "
                    + "reassign or remove them first (this also blocks deleting the company you're currently switched into)");
        }
        // Since V46, every other company_id foreign key cascades on delete — removing a subsidiary
        // permanently deletes all of its indicators, materiality assessments, governance records,
        // emissions data, sign-offs, exports, invoices, etc. along with it. This is deliberate and
        // irreversible; the frontend requires typing the company's exact name to confirm before
        // calling this endpoint. The catch below is a defensive fallback only — it should not
        // normally trigger, but protects against a future company-scoped table being added without
        // an explicit ON DELETE action.
        try {
            companyRepository.delete(target);
            companyRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Cannot delete " + target.getName() + " — it still has data referencing it "
                    + "that isn't set up to cascade. Please contact support.");
        }
    }

    private static final java.util.Set<Role> ASSIGNABLE_ROLES = java.util.Set.of(Role.COMPANY_ADMIN, Role.COMPANY_CONTRIBUTOR, Role.CONSULTANT);

    @Transactional
    public CreateTenantUserResponse createUser(CreateTenantUserRequest request) {
        if (appUserRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("An account with this email already exists");
        }
        if (!ASSIGNABLE_ROLES.contains(request.role())) {
            throw new IllegalArgumentException("Cannot assign platform-level role: " + request.role());
        }

        CustomRole customRole = resolveCustomRole(request.role(), request.customRoleId());
        String temporaryPassword = generateTemporaryPassword();

        AppUser user = new AppUser();
        user.setCompany(currentCompany());
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setRole(request.role());
        user.setCustomRole(customRole);
        user = appUserRepository.save(user);

        return CreateTenantUserResponse.from(user, temporaryPassword);
    }

    @Transactional(readOnly = true)
    public List<TeamInviteResponse> listInvites() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return teamInviteRepository.findByCompanyIdAndAcceptedAtIsNullAndRevokedAtIsNullOrderByCreatedAtDesc(companyId).stream()
                .map(this::toInviteResponse)
                .toList();
    }

    @Transactional
    public TeamInviteResponse createInvite(CreateTenantUserRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        if (appUserRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("An account with this email already exists");
        }
        if (teamInviteRepository.existsByCompanyIdAndEmailIgnoreCaseAndAcceptedAtIsNullAndRevokedAtIsNull(companyId, request.email())) {
            throw new ConflictException("An invite is already pending for this email — resend or revoke it instead");
        }
        if (!ASSIGNABLE_ROLES.contains(request.role())) {
            throw new IllegalArgumentException("Cannot assign platform-level role: " + request.role());
        }

        CustomRole customRole = resolveCustomRole(request.role(), request.customRoleId());
        Company company = currentCompany();
        AppUser inviter = appUserRepository.findById(currentUserProvider.getPrincipal().userId()).orElse(null);

        TeamInvite invite = new TeamInvite();
        invite.setCompanyId(companyId);
        invite.setName(request.name());
        invite.setEmail(request.email());
        invite.setRole(request.role());
        invite.setCustomRole(customRole);
        invite.setToken(generateInviteToken());
        invite.setInvitedByName(inviter != null ? inviter.getName() : "Unknown");
        invite.setExpiresAt(Instant.now().plus(INVITE_VALIDITY_DAYS, ChronoUnit.DAYS));
        invite = teamInviteRepository.save(invite);

        String inviteUrl = buildInviteUrl(invite.getToken());
        emailService.sendInviteEmail(companyId, invite.getEmail(), invite.getName(), company.getName(), invite.getInvitedByName(), invite.getRole(), inviteUrl);

        return toInviteResponse(invite);
    }

    @Transactional
    public TeamInviteResponse resendInvite(UUID inviteId) {
        TeamInvite invite = requireOwnedInvite(inviteId);
        Company company = currentCompany();

        invite.setToken(generateInviteToken());
        invite.setExpiresAt(Instant.now().plus(INVITE_VALIDITY_DAYS, ChronoUnit.DAYS));
        invite = teamInviteRepository.save(invite);

        String inviteUrl = buildInviteUrl(invite.getToken());
        emailService.sendInviteEmail(invite.getCompanyId(), invite.getEmail(), invite.getName(), company.getName(), invite.getInvitedByName(), invite.getRole(), inviteUrl);

        return toInviteResponse(invite);
    }

    @Transactional
    public void revokeInvite(UUID inviteId) {
        TeamInvite invite = requireOwnedInvite(inviteId);
        invite.setRevokedAt(Instant.now());
        teamInviteRepository.save(invite);
    }

    private TeamInvite requireOwnedInvite(UUID inviteId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        TeamInvite invite = teamInviteRepository.findById(inviteId)
                .orElseThrow(() -> new NotFoundException("Invite not found"));
        if (!companyId.equals(invite.getCompanyId())) {
            throw new NotFoundException("Invite not found");
        }
        return invite;
    }

    private TeamInviteResponse toInviteResponse(TeamInvite invite) {
        return TeamInviteResponse.from(invite, buildInviteUrl(invite.getToken()));
    }

    private String buildInviteUrl(String token) {
        // Hash routing, not path — see EmailVerificationService for why.
        return platformSettingsService.getEffectiveAppBaseUrl() + "/#/accept-invite?token=" + token;
    }

    private String generateInviteToken() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @Transactional
    public TenantUserResponse updateUserRole(UUID userId, UpdateUserRoleRequest request) {
        AppUser user = requireOwnedUser(userId);
        if (userId.equals(currentUserProvider.getPrincipal().userId())) {
            throw new ConflictException("You cannot change your own role");
        }
        if (!ASSIGNABLE_ROLES.contains(request.role())) {
            throw new IllegalArgumentException("Cannot assign platform-level role: " + request.role());
        }
        if (request.role() != Role.COMPANY_ADMIN) {
            requireNotLastActiveAdmin(user.getCompany().getId(), user);
        }
        CustomRole customRole = resolveCustomRole(request.role(), request.customRoleId());
        user.setRole(request.role());
        user.setCustomRole(customRole);
        return toTenantUserResponse(appUserRepository.save(user));
    }

    @Transactional
    public TenantUserResponse setUserActive(UUID userId, boolean active) {
        AppUser user = requireOwnedUser(userId);
        if (userId.equals(currentUserProvider.getPrincipal().userId())) {
            throw new ConflictException("You cannot deactivate your own account");
        }
        if (!active) {
            requireNotLastActiveAdmin(user.getCompany().getId(), user);
        }
        user.setActive(active);
        return toTenantUserResponse(appUserRepository.save(user));
    }

    private AppUser requireOwnedUser(UUID userId) {
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        UUID companyId = currentUserProvider.requireCompanyId();
        if (user.getCompany() == null || !companyId.equals(user.getCompany().getId())) {
            throw new NotFoundException("User not found");
        }
        return user;
    }

    private TenantUserResponse toTenantUserResponse(AppUser u) {
        return new TenantUserResponse(u.getId(), u.getName(), u.getEmail(), u.getRole(),
                u.getCustomRole() != null ? u.getCustomRole().getId() : null,
                u.getCustomRole() != null ? u.getCustomRole().getName() : null,
                Boolean.TRUE.equals(u.getActive()), u.getCreatedAt());
    }

    private String generateTemporaryPassword() {
        byte[] bytes = new byte[18];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // --- Platform-admin operations: not scoped to the current user's own company ---

    @Transactional(readOnly = true)
    public List<TenantSummaryResponse> listTenants() {
        return companyRepository.findAllByOrderByCreatedAtAscIdAsc().stream().map(this::toSummary).toList();
    }

    @Transactional
    public TenantSummaryResponse adminUpdatePlan(UUID companyId, UpdatePlanRequest request) {
        Company company = findCompany(companyId);
        SubscriptionPlan previousPlan = company.getSubscriptionPlan();
        company.setSubscriptionPlan(request.plan());
        TenantSummaryResponse response = toSummary(companyRepository.save(company));
        logPlanChange(company, previousPlan, request.plan());
        return response;
    }

    @Transactional
    public TenantSummaryResponse adminUpdateStatus(UUID companyId, UpdateTenantStatusRequest request) {
        Company company = findCompany(companyId);
        company.setActive(request.active());
        return toSummary(companyRepository.save(company));
    }

    @Transactional(readOnly = true)
    public List<TenantUserResponse> listTenantUsers(UUID companyId) {
        findCompany(companyId);
        return appUserRepository.findByCompanyIdOrderByCreatedAtAscIdAsc(companyId).stream()
                .map(this::toTenantUserResponse)
                .toList();
    }

    private Company findCompany(UUID companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));
    }

    private TenantSummaryResponse toSummary(Company company) {
        List<AppUser> users = appUserRepository.findByCompanyIdOrderByCreatedAtAscIdAsc(company.getId());
        AppUser primaryContact = users.stream()
                .filter(u -> u.getRole() == Role.COMPANY_ADMIN)
                .min(Comparator.comparing(AppUser::getCreatedAt))
                .or(() -> users.stream().min(Comparator.comparing(AppUser::getCreatedAt)))
                .orElse(null);

        return new TenantSummaryResponse(
                company.getId(),
                company.getName(),
                company.getSector() != null ? company.getSector().getCode() : null,
                company.getMarketClassification(),
                company.getSubscriptionPlan(),
                Boolean.TRUE.equals(company.getActive()),
                company.getCreatedAt(),
                primaryContact != null ? primaryContact.getName() : null,
                primaryContact != null ? primaryContact.getEmail() : null,
                company.getTrialEndsAt(),
                Boolean.TRUE.equals(company.getTrialConverted())
        );
    }

    /** No entry when the plan is re-saved unchanged — the log records changes, not writes. */
    private void logPlanChange(Company company, SubscriptionPlan previousPlan, SubscriptionPlan newPlan) {
        if (previousPlan == newPlan) {
            return;
        }
        activityLogService.record(company.getId(), company.getName(), ActivityEventType.PLAN_CHANGE,
                "Subscription plan changed from " + previousPlan + " to " + newPlan);
    }

}
