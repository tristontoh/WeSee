package com.wesee.esg.user;

import com.wesee.esg.user.dto.ChangePasswordRequest;
import com.wesee.esg.user.dto.UpdateUserProfileRequest;
import com.wesee.esg.user.dto.UserProfileResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Self-service profile management, open to every authenticated role. */
@RestController
@RequestMapping("/api/v1/users/me")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping
    public UserProfileResponse getProfile() {
        return userProfileService.getMyProfile();
    }

    @PatchMapping
    public UserProfileResponse updateProfile(@Valid @RequestBody UpdateUserProfileRequest request) {
        return userProfileService.updateMyProfile(request);
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userProfileService.changeMyPassword(request);
        return ResponseEntity.noContent().build();
    }
}
