package com.wesee.esg.user;

import com.wesee.esg.common.exceptions.ForbiddenException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.session.UserSessionService;
import com.wesee.esg.user.dto.ChangePasswordRequest;
import com.wesee.esg.user.dto.UpdateUserProfileRequest;
import com.wesee.esg.user.dto.UserProfileResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserProfileService {

    private static final List<String> AVATAR_PALETTE = List.of(
            "#059669", "#2563eb", "#7c3aed", "#db2777", "#d97706", "#0891b2", "#dc2626", "#4f46e5"
    );

    private final AppUserRepository appUserRepository;
    private final UserDetailsRepository userDetailsRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserProvider currentUserProvider;
    private final UserSessionService userSessionService;

    public UserProfileService(AppUserRepository appUserRepository,
                               UserDetailsRepository userDetailsRepository,
                               PasswordEncoder passwordEncoder,
                               CurrentUserProvider currentUserProvider,
                               UserSessionService userSessionService) {
        this.appUserRepository = appUserRepository;
        this.userDetailsRepository = userDetailsRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentUserProvider = currentUserProvider;
        this.userSessionService = userSessionService;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile() {
        AppUser user = currentUser();
        UserDetails details = userDetailsRepository.findByUserId(user.getId()).orElse(null);
        return toResponse(user, details);
    }

    @Transactional
    public UserProfileResponse updateMyProfile(UpdateUserProfileRequest request) {
        AppUser user = currentUser();
        user.setName(request.name());
        appUserRepository.save(user);

        UserDetails details = userDetailsRepository.findByUserId(user.getId()).orElseGet(() -> newDetailsFor(user.getId()));
        details.setPhone(request.phone());
        details.setJobTitle(request.jobTitle());
        details.setDepartment(request.department());
        details.setBio(request.bio());
        details = userDetailsRepository.save(details);

        return toResponse(user, details);
    }

    @Transactional
    public void changeMyPassword(ChangePasswordRequest request) {
        AppUser user = currentUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ForbiddenException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setTokenVersion(user.getTokenVersion() + 1);
        appUserRepository.save(user);
        userSessionService.revokeAll(user.getId());
    }

    private AppUser currentUser() {
        UUID userId = currentUserProvider.getPrincipal().userId();
        return appUserRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
    }

    private UserDetails newDetailsFor(UUID userId) {
        UserDetails details = new UserDetails();
        details.setUserId(userId);
        details.setAvatarColor(AVATAR_PALETTE.get(Math.abs(userId.hashCode()) % AVATAR_PALETTE.size()));
        return details;
    }

    private UserProfileResponse toResponse(AppUser user, UserDetails details) {
        String avatarColor = details != null ? details.getAvatarColor()
                : AVATAR_PALETTE.get(Math.abs(user.getId().hashCode()) % AVATAR_PALETTE.size());
        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getCompany() != null ? user.getCompany().getName() : null,
                details != null ? details.getPhone() : null,
                details != null ? details.getJobTitle() : null,
                details != null ? details.getDepartment() : null,
                details != null ? details.getBio() : null,
                avatarColor,
                user.getCreatedAt()
        );
    }
}
