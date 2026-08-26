package com.wesee.esg.auth;

import com.wesee.esg.auth.dto.AcceptInviteRequest;
import com.wesee.esg.auth.dto.AuthResponse;
import com.wesee.esg.auth.dto.ForgotPasswordRequest;
import com.wesee.esg.auth.dto.ForgotPasswordResponse;
import com.wesee.esg.auth.dto.InvitePreviewResponse;
import com.wesee.esg.auth.dto.LoginRequest;
import com.wesee.esg.auth.dto.LoginResponse;
import com.wesee.esg.auth.dto.MeResponse;
import com.wesee.esg.auth.dto.OnboardingRequest;
import com.wesee.esg.auth.dto.RegisterRequest;
import com.wesee.esg.auth.dto.RegisterResponse;
import com.wesee.esg.auth.dto.ResendVerificationRequest;
import com.wesee.esg.auth.dto.ResetPasswordRequest;
import com.wesee.esg.auth.dto.ResendVerificationResponse;
import com.wesee.esg.auth.dto.SessionMetadata;
import com.wesee.esg.auth.dto.UpdateProfileRequest;
import com.wesee.esg.auth.dto.VerifyEmailRequest;
import com.wesee.esg.auth.dto.VerifyMfaRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLConnection;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final ProfileAvatarService profileAvatarService;

    public AuthController(AuthService authService, ProfileAvatarService profileAvatarService) {
        this.authService = authService;
        this.profileAvatarService = profileAvatarService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<ResendVerificationResponse> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerification(request.email());
        return ResponseEntity.ok(new ResendVerificationResponse(
                "If an account exists for that email and it isn't verified yet, we've sent a new verification link."));
    }

    /** Deliberately the same reply whether or not the email is registered — see PasswordResetService.requestReset. */
    @PostMapping("/forgot-password")
    public ResponseEntity<ForgotPasswordResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request.email());
        return ResponseEntity.ok(new ForgotPasswordResponse(
                "If an account exists for that email, we've sent a password reset link."));
    }

    /** Lets the reset screen reject a dead link before asking for a new password. */
    @GetMapping("/reset-password/{token}")
    public ResponseEntity<Void> validateResetToken(@PathVariable String token) {
        authService.validatePasswordResetToken(token);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password/{token}")
    public ResponseEntity<Void> resetPassword(@PathVariable String token, @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(token, request.newPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, sessionMetadata(httpRequest)));
    }

    @PostMapping("/login/verify-mfa")
    public ResponseEntity<AuthResponse> verifyMfa(@Valid @RequestBody VerifyMfaRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.verifyMfa(request, sessionMetadata(httpRequest)));
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me() {
        return ResponseEntity.ok(authService.me());
    }

    @PatchMapping("/onboarding")
    public ResponseEntity<MeResponse> completeOnboarding(@Valid @RequestBody OnboardingRequest request) {
        return ResponseEntity.ok(authService.completeOnboarding(request));
    }

    @PatchMapping("/profile")
    public ResponseEntity<MeResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(request));
    }

    @PostMapping("/profile/avatar")
    public ResponseEntity<MeResponse> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(profileAvatarService.uploadAvatar(file));
    }

    @GetMapping("/profile/avatar")
    public ResponseEntity<Resource> downloadAvatar() {
        ProfileAvatarService.StoredFile stored = profileAvatarService.downloadAvatar();
        Resource resource = new FileSystemResource(stored.path());
        String contentType = URLConnection.guessContentTypeFromName(stored.originalFileName());
        return ResponseEntity.ok()
                .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(resource);
    }

    @DeleteMapping("/profile/avatar")
    public ResponseEntity<MeResponse> removeAvatar() {
        return ResponseEntity.ok(profileAvatarService.removeAvatar());
    }

    @GetMapping("/invites/{token}")
    public ResponseEntity<InvitePreviewResponse> previewInvite(@PathVariable String token) {
        return ResponseEntity.ok(authService.previewInvite(token));
    }

    @PostMapping("/invites/{token}/accept")
    public ResponseEntity<AuthResponse> acceptInvite(@PathVariable String token, @Valid @RequestBody AcceptInviteRequest request,
                                                       HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.acceptInvite(token, request, sessionMetadata(httpRequest)));
    }

    private SessionMetadata sessionMetadata(HttpServletRequest request) {
        return new SessionMetadata(request.getRemoteAddr(), request.getHeader("User-Agent"));
    }
}
