/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.auth;

import com.wesee.esg.activitylog.ActivityEventType;
import com.wesee.esg.activitylog.PlatformActivityLogService;
import com.wesee.esg.auth.dto.AcceptInviteRequest;
import com.wesee.esg.auth.dto.AuthResponse;
import com.wesee.esg.auth.dto.InvitePreviewResponse;
import com.wesee.esg.auth.dto.LoginRequest;
import com.wesee.esg.auth.dto.LoginResponse;
import com.wesee.esg.auth.dto.MeResponse;
import com.wesee.esg.auth.dto.OnboardingRequest;
import com.wesee.esg.auth.dto.RegisterRequest;
import com.wesee.esg.auth.dto.RegisterResponse;
import com.wesee.esg.auth.dto.SessionMetadata;
import com.wesee.esg.auth.dto.UpdateProfileRequest;
import com.wesee.esg.auth.dto.VerifyMfaRequest;
import com.wesee.esg.common.exceptions.AccountLockedException;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.ForbiddenException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.emailverification.EmailVerificationService;
import com.wesee.esg.mfa.MfaService;
import com.wesee.esg.passwordreset.PasswordResetService;
import com.wesee.esg.platform.PlatformSettingsService;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.security.JwtProperties;
import com.wesee.esg.security.JwtService;
import com.wesee.esg.session.UserSessionService;
import com.wesee.esg.permission.CustomRole;
import com.wesee.esg.permission.CustomRoleRepository;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.Sector;
import com.wesee.esg.tenant.SectorRepository;
import com.wesee.esg.tenant.SubscriptionPlan;
import com.wesee.esg.tenant.TeamInvite;
import com.wesee.esg.tenant.TeamInviteRepository;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import com.wesee.esg.user.Role;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final CompanyRepository companyRepository;
    private final SectorRepository sectorRepository;
    private final TeamInviteRepository teamInviteRepository;
    private final CustomRoleRepository customRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CurrentUserProvider currentUserProvider;
    private final MfaService mfaService;
    private final UserSessionService userSessionService;
    private final EmailVerificationService emailVerificationService;
    private final PlatformSettingsService platformSettingsService;
    private final PasswordResetService passwordResetService;
    private final PlatformActivityLogService activityLogService;
    private final LoginAttemptService loginAttemptService;

    /**
     * The permissions V57 gave every pre-existing company's "Member" role — every key whose
     * endpoint was not COMPANY_ADMIN-gated at that migration. Reproduced here so a workspace
     * registered today starts with the same default as one that predates the migration; the two
     * must not drift.
     */
    private static final List<String> DEFAULT_MEMBER_PERMISSIONS = List.of(
            "dashboard.view", "materiality.view", "materiality.edit", "indicators.view",
            "indicators.edit", "targets.view", "targets.edit", "reports.view", "reports.generate",
            "governance.view", "governance.edit", "ifrs.view", "ifrs.edit", "assurance.view",
            "assurance.signoff", "api_access.view", "team.view", "billing.view", "settings.view");

    private static CustomRole defaultMemberRole(Company company) {
        CustomRole role = new CustomRole();
        role.setCompanyId(company.getId());
        role.setName("Member");
        role.setDescription("Default role for non-admin team members.");
        role.setPermissionKeys(DEFAULT_MEMBER_PERMISSIONS);
        return role;
    }
    private final long jwtExpirationMinutes;

    public AuthService(AppUserRepository appUserRepository,
                        CompanyRepository companyRepository,
                        SectorRepository sectorRepository,
                        TeamInviteRepository teamInviteRepository,
                        CustomRoleRepository customRoleRepository,
                        PasswordEncoder passwordEncoder,
                        JwtService jwtService,
                        CurrentUserProvider currentUserProvider,
                        MfaService mfaService,
                        UserSessionService userSessionService,
                        EmailVerificationService emailVerificationService,
                        PlatformSettingsService platformSettingsService,
                        PasswordResetService passwordResetService,
                        PlatformActivityLogService activityLogService,
                        LoginAttemptService loginAttemptService,
                        JwtProperties jwtProperties) {
        this.appUserRepository = appUserRepository;
        this.companyRepository = companyRepository;
        this.sectorRepository = sectorRepository;
        this.teamInviteRepository = teamInviteRepository;
        this.customRoleRepository = customRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.currentUserProvider = currentUserProvider;
        this.mfaService = mfaService;
        this.userSessionService = userSessionService;
        this.emailVerificationService = emailVerificationService;
        this.platformSettingsService = platformSettingsService;
        this.passwordResetService = passwordResetService;
        this.activityLogService = activityLogService;
        this.loginAttemptService = loginAttemptService;
        this.jwtExpirationMinutes = jwtProperties.getExpirationMinutes();
    }

    /**
     * Forgotten-password flow. All three delegate: the token's lifecycle belongs to
     * PasswordResetService, and AuthService stays the single entry point the controller talks to.
     */
    @Transactional
    public void requestPasswordReset(String email) {
        passwordResetService.requestReset(email);
    }

    @Transactional(readOnly = true)
    public void validatePasswordResetToken(String token) {
        passwordResetService.validate(token);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        passwordResetService.resetPassword(token, newPassword);
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (appUserRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("An account with this email already exists");
        }

        Company company = new Company();
        company.setName(request.companyName());
        company.setMarketClassification(MarketClassification.SME);
        company.setSubscriptionPlan(SubscriptionPlan.STARTER);
        company.setOnboardingCompleted(false);
        company = companyRepository.save(company);

        /*
         * V57 seeded one of these per company that existed when it ran, but nothing created one for
         * a workspace registered afterwards. A non-admin needs a custom role — resolveCustomRole
         * rejects the invite without one — so every new workspace failed on its first attempt to
         * invite anyone who was not an admin, while older tenants worked.
         */
        customRoleRepository.save(defaultMemberRole(company));

        AppUser user = new AppUser();
        user.setCompany(company);
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setName(request.name());
        user.setRole(Role.COMPANY_ADMIN);
        user.setEmailVerified(false);
        user = appUserRepository.save(user);

        emailVerificationService.sendVerificationEmail(user);

        activityLogService.record(company.getId(), company.getName(), ActivityEventType.SIGNUP,
                user.getName() + " registered a new workspace");

        return new RegisterResponse(user.getEmail());
    }

    @Transactional
    public LoginResponse login(LoginRequest request, SessionMetadata meta) {
        AppUser user = appUserRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        /*
         * Checked before the password, not after: a locked account that still answers a correct
         * guess differently from a wrong one is not locked, it is just slower to be right.
         */
        Optional<Long> lockedFor = loginAttemptService.lockedSecondsRemaining(user);
        if (lockedFor.isPresent()) {
            throw new AccountLockedException(
                    "Too many failed sign-in attempts. Try again in "
                            + Math.max(1, (lockedFor.get() + 59) / 60) + " minutes, or reset your password.",
                    lockedFor.get());
        }

        // A deactivated user can never sign in, so a wrong password on one is not worth counting.
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            loginAttemptService.recordFailure(user.getId());
            throw new BadCredentialsException("Invalid email or password");
        }
        loginAttemptService.recordSuccess(user.getId());

        /*
         * The company, not just the user. A PLATFORM_ADMIN suspending a tenant used to write
         * company.active and change nothing — every one of its users kept signing in. Refused here
         * so it takes effect at the door, and again in CompanyAccessFilter so tokens already issued
         * stop working now rather than whenever they happen to expire.
         */
        Company company = user.getCompany();
        if (company != null && (!Boolean.TRUE.equals(company.getActive()) || company.getClosedAt() != null)) {
            throw new ForbiddenException(
                    "This workspace has been suspended. Contact support if you believe this is a mistake.");
        }

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            return new LoginResponse(false, null, true, null);
        }

        if (mfaService.isEnabled(user.getId())) {
            String mfaToken = jwtService.generateMfaChallengeToken(user.getId());
            return new LoginResponse(true, mfaToken, false, null);
        }

        return new LoginResponse(false, null, false, issueSession(user, meta));
    }

    @Transactional
    public void verifyEmail(String token) {
        emailVerificationService.verify(token);
    }

    @Transactional
    public void resendVerification(String email) {
        emailVerificationService.resend(email);
    }

    @Transactional
    public AuthResponse verifyMfa(VerifyMfaRequest request, SessionMetadata meta) {
        UUID userId = jwtService.parseMfaChallenge(request.mfaToken())
                .orElseThrow(() -> new BadCredentialsException("MFA session expired — please log in again"));
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new BadCredentialsException("MFA session expired — please log in again"));

        if (!mfaService.verifyLoginCode(userId, request.code())) {
            throw new BadCredentialsException("Invalid verification code");
        }

        return issueSession(user, meta);
    }

    private AuthResponse issueSession(AppUser user, SessionMetadata meta) {
        UUID jti = UUID.randomUUID();
        String token = jwtService.generateToken(user, jti);
        Instant expiresAt = Instant.now().plus(jwtExpirationMinutes, ChronoUnit.MINUTES);
        userSessionService.record(user.getId(), jti, meta.ipAddress(), meta.userAgent(), expiresAt);
        return new AuthResponse(token, toMeResponse(user));
    }

    @Transactional(readOnly = true)
    public InvitePreviewResponse previewInvite(String token) {
        TeamInvite invite = requireValidInvite(token);
        Company company = companyRepository.findById(invite.getCompanyId())
                .orElseThrow(() -> new NotFoundException("Company not found"));
        return new InvitePreviewResponse(company.getName(), invite.getName(), invite.getEmail(), invite.getRole(), invite.getInvitedByName());
    }

    @Transactional
    public AuthResponse acceptInvite(String token, AcceptInviteRequest request, SessionMetadata meta) {
        TeamInvite invite = requireValidInvite(token);
        if (appUserRepository.existsByEmailIgnoreCase(invite.getEmail())) {
            throw new ConflictException("An account with this email already exists");
        }
        Company company = companyRepository.findById(invite.getCompanyId())
                .orElseThrow(() -> new NotFoundException("Company not found"));

        AppUser user = new AppUser();
        user.setCompany(company);
        user.setEmail(invite.getEmail());
        user.setName(request.name());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(invite.getRole());
        // The invite already carries the role the admin chose, and TeamInvite documents it as
        // "copied onto the AppUser when the invite is accepted". Without this the new account has
        // no custom role at all, so @perm.check denies every key and the person lands on an app
        // with nothing in it — every invited non-admin was locked out.
        user.setCustomRole(invite.getCustomRole());
        user = appUserRepository.save(user);

        invite.setAcceptedAt(Instant.now());
        teamInviteRepository.save(invite);

        return issueSession(user, meta);
    }

    private TeamInvite requireValidInvite(String token) {
        TeamInvite invite = teamInviteRepository.findByToken(token)
                .orElseThrow(() -> new NotFoundException("Invite not found"));
        if (invite.getRevokedAt() != null) {
            throw new ConflictException("This invite has been revoked");
        }
        if (invite.getAcceptedAt() != null) {
            throw new ConflictException("This invite has already been accepted");
        }
        if (invite.getExpiresAt().isBefore(Instant.now())) {
            throw new ConflictException("This invite has expired — ask an admin to resend it");
        }
        return invite;
    }

    @Transactional(readOnly = true)
    public MeResponse me() {
        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        return toMeResponse(user);
    }

    @Transactional
    public MeResponse updateProfile(UpdateProfileRequest request) {
        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (!user.getEmail().equalsIgnoreCase(request.email()) && appUserRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("An account with this email already exists");
        }

        user.setName(request.name());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setDateOfBirth(request.dateOfBirth());
        user.setAddress(request.address());
        user.setBio(request.bio());
        user = appUserRepository.save(user);

        return toMeResponse(user);
    }

    @Transactional
    public MeResponse completeOnboarding(OnboardingRequest request) {
        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        Company company = user.getCompany();
        if (company == null) {
            throw new NotFoundException("No company associated with current user");
        }

        company.setMarketClassification(request.market());
        company.setSubscriptionPlan(planForMarket(request.market()));
        company.setOnboardingCompleted(true);
        // The clock starts when the workspace is actually usable, not at registration — someone who
        // signs up and finishes setting up a week later gets the full fourteen days.
        company.setTrialEndsAt(Instant.now().plus(14, ChronoUnit.DAYS));
        company.setFrameworks(request.frameworks() != null ? request.frameworks() : java.util.List.of());
        company.setPriorities(request.priorities() != null ? request.priorities() : java.util.List.of());

        if (request.sectorCode() != null && !request.sectorCode().isBlank()) {
            Sector sector = sectorRepository.findById(request.sectorCode())
                    .orElseThrow(() -> new NotFoundException("Unknown sector code: " + request.sectorCode()));
            company.setSector(sector);
        }

        companyRepository.save(company);
        return toMeResponse(user);
    }

    private SubscriptionPlan planForMarket(MarketClassification market) {
        return switch (market) {
            case SME -> SubscriptionPlan.STARTER;
            case ACE_MARKET -> SubscriptionPlan.GROWTH;
            case MAIN_MARKET -> SubscriptionPlan.ISSUER_READY;
        };
    }

    MeResponse toMeResponse(AppUser user) {
        Company company = user.getCompany();
        boolean mfaSetupRequired = platformSettingsService.isMfaRequired() && !mfaService.isEnabled(user.getId());
        return new MeResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                company != null ? company.getId() : null,
                company != null ? company.getName() : null,
                company != null && company.getSector() != null ? company.getSector().getCode() : null,
                company != null ? company.getMarketClassification() : null,
                company != null ? company.getSubscriptionPlan() : null,
                company != null && Boolean.TRUE.equals(company.getOnboardingCompleted()),
                company != null ? company.getFrameworks() : java.util.List.of(),
                company != null ? company.getPriorities() : java.util.List.of(),
                user.getPhone(),
                user.getDateOfBirth(),
                user.getAddress(),
                user.getBio(),
                user.getAvatarPath() != null,
                mfaSetupRequired,
                // Empty for COMPANY_ADMIN, which holds no custom role and passes every check
                // implicitly — see PermissionGateService.
                user.getCustomRole() != null ? user.getCustomRole().getPermissionKeys() : java.util.List.of(),
                company != null ? company.getTrialEndsAt() : null,
                company != null && Boolean.TRUE.equals(company.getTrialConverted()),
                company != null && (!Boolean.TRUE.equals(company.getActive()) || company.getClosedAt() != null)
        );
    }
}
