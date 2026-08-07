package com.wesee.esg.tenant;

import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.email.EmailService;
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
    private final SecureRandom random = new SecureRandom();

    public CompanyService(CompanyRepository companyRepository, SectorRepository sectorRepository,
                           AppUserRepository appUserRepository, TeamInviteRepository teamInviteRepository,
                           CurrentUserProvider currentUserProvider, PasswordEncoder passwordEncoder,
                           EmailService emailService, PlatformSettingsService platformSettingsService) {
        this.companyRepository = companyRepository;
        this.sectorRepository = sectorRepository;
        this.appUserRepository = appUserRepository;
        this.teamInviteRepository = teamInviteRepository;
        this.currentUserProvider = currentUserProvider;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.platformSettingsService = platformSettingsService;
    }

    @Transactional(readOnly = true)
    public CompanyResponse getCurrent() {
        return CompanyResponse.from(currentCompany());
    }

    @Transactional
    public CompanyResponse updatePlan(UpdatePlanRequest request) {
        Company company = currentCompany();
        company.setSubscriptionPlan(request.plan());
        return CompanyResponse.from(companyRepository.save(company));
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

    private Company groupRoot(Company company) {
        return company.getParentCompany() != null ? company.getParentCompany() : company;
    }

    @Transactional(readOnly = true)
    public List<CompanyGroupMemberResponse> getGroup() {
        UUID currentCompanyId = currentUserProvider.requireCompanyId();
        Company root = groupRoot(currentCompany());
        List<Company> members = new java.util.ArrayList<>();
        members.add(root);
        members.addAll(companyRepository.findByParentCompanyId(root.getId()));
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
        subsidiary = companyRepository.save(subsidiary);

        return CompanyGroupMemberResponse.from(subsidiary, false);
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
        if (!appUserRepository.findByCompanyId(companyId).isEmpty()) {
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

        String temporaryPassword = generateTemporaryPassword();

        AppUser user = new AppUser();
        user.setCompany(currentCompany());
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setRole(request.role());
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

        Company company = currentCompany();
        AppUser inviter = appUserRepository.findById(currentUserProvider.getPrincipal().userId()).orElse(null);

        TeamInvite invite = new TeamInvite();
        invite.setCompanyId(companyId);
        invite.setName(request.name());
        invite.setEmail(request.email());
        invite.setRole(request.role());
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
        user.setRole(request.role());
        return toTenantUserResponse(appUserRepository.save(user));
    }

    @Transactional
    public TenantUserResponse setUserActive(UUID userId, boolean active) {
        AppUser user = requireOwnedUser(userId);
        if (userId.equals(currentUserProvider.getPrincipal().userId())) {
            throw new ConflictException("You cannot deactivate your own account");
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
        return companyRepository.findAll().stream().map(this::toSummary).toList();
    }

    @Transactional
    public TenantSummaryResponse adminUpdatePlan(UUID companyId, UpdatePlanRequest request) {
        Company company = findCompany(companyId);
        company.setSubscriptionPlan(request.plan());
        return toSummary(companyRepository.save(company));
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
        return appUserRepository.findByCompanyId(companyId).stream()
                .map(u -> new TenantUserResponse(u.getId(), u.getName(), u.getEmail(), u.getRole(),
                        Boolean.TRUE.equals(u.getActive()), u.getCreatedAt()))
                .toList();
    }

    private Company findCompany(UUID companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));
    }

    private TenantSummaryResponse toSummary(Company company) {
        List<AppUser> users = appUserRepository.findByCompanyId(company.getId());
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
                primaryContact != null ? primaryContact.getEmail() : null
        );
    }
}
