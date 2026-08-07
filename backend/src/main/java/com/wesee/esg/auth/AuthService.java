package com.wesee.esg.auth;

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
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.emailverification.EmailVerificationService;
import com.wesee.esg.mfa.MfaService;
import com.wesee.esg.platform.PlatformSettingsService;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.security.JwtProperties;
import com.wesee.esg.security.JwtService;
import com.wesee.esg.session.UserSessionService;
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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final CompanyRepository companyRepository;
    private final SectorRepository sectorRepository;
    private final TeamInviteRepository teamInviteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CurrentUserProvider currentUserProvider;
    private final MfaService mfaService;
    private final UserSessionService userSessionService;
    private final EmailVerificationService emailVerificationService;
    private final PlatformSettingsService platformSettingsService;
    private final long jwtExpirationMinutes;

    public AuthService(AppUserRepository appUserRepository,
                        CompanyRepository companyRepository,
                        SectorRepository sectorRepository,
                        TeamInviteRepository teamInviteRepository,
                        PasswordEncoder passwordEncoder,
                        JwtService jwtService,
                        CurrentUserProvider currentUserProvider,
                        MfaService mfaService,
                        UserSessionService userSessionService,
                        EmailVerificationService emailVerificationService,
                        PlatformSettingsService platformSettingsService,
                        JwtProperties jwtProperties) {
        this.appUserRepository = appUserRepository;
        this.companyRepository = companyRepository;
        this.sectorRepository = sectorRepository;
        this.teamInviteRepository = teamInviteRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.currentUserProvider = currentUserProvider;
        this.mfaService = mfaService;
        this.userSessionService = userSessionService;
        this.emailVerificationService = emailVerificationService;
        this.platformSettingsService = platformSettingsService;
        this.jwtExpirationMinutes = jwtProperties.getExpirationMinutes();
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

        AppUser user = new AppUser();
        user.setCompany(company);
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setName(request.name());
        user.setRole(Role.COMPANY_ADMIN);
        user.setEmailVerified(false);
        user = appUserRepository.save(user);

        emailVerificationService.sendVerificationEmail(user);

        return new RegisterResponse(user.getEmail());
    }

    @Transactional
    public LoginResponse login(LoginRequest request, SessionMetadata meta) {
        AppUser user = appUserRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!Boolean.TRUE.equals(user.getActive()) || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
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
                mfaSetupRequired
        );
    }
}
