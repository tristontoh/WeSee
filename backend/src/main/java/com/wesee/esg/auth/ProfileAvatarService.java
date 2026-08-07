package com.wesee.esg.auth;

import com.wesee.esg.auth.dto.MeResponse;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Local-disk profile photo storage, mirroring {@code IndicatorEvidenceService}'s pattern — no S3/cloud dependency. */
@Service
public class ProfileAvatarService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("png", "jpg", "jpeg");
    private static final long MAX_FILE_SIZE_BYTES = 2L * 1024 * 1024;

    private final AppUserRepository appUserRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AuthService authService;
    private final Path uploadsRoot;

    public ProfileAvatarService(AppUserRepository appUserRepository,
                                 CurrentUserProvider currentUserProvider,
                                 AuthService authService,
                                 @Value("${wesee.uploads.dir}") String uploadsDir) {
        this.appUserRepository = appUserRepository;
        this.currentUserProvider = currentUserProvider;
        this.authService = authService;
        this.uploadsRoot = Paths.get(uploadsDir).toAbsolutePath().normalize();
    }

    public record StoredFile(Path path, String originalFileName) {
    }

    @Transactional
    public MeResponse uploadAvatar(MultipartFile file) {
        AppUser user = currentUser();

        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds the 2MB limit");
        }
        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank() ? file.getOriginalFilename() : "avatar");
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type: ." + extension + " (use PNG or JPG)");
        }

        try {
            Path dir = uploadsRoot.resolve(Paths.get("avatars", user.getId().toString()));
            Files.createDirectories(dir);

            deleteExistingFile(user);

            String storedName = UUID.randomUUID() + "." + extension;
            Path target = dir.resolve(storedName).normalize();
            if (!target.startsWith(dir)) {
                throw new IllegalArgumentException("Invalid file name");
            }
            file.transferTo(target);

            user.setAvatarPath(uploadsRoot.relativize(target).toString());
            user.setAvatarOriginalName(originalName);
            appUserRepository.save(user);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store avatar file", e);
        }

        return authService.toMeResponse(user);
    }

    @Transactional
    public MeResponse removeAvatar() {
        AppUser user = currentUser();
        deleteExistingFile(user);
        user.setAvatarPath(null);
        user.setAvatarOriginalName(null);
        appUserRepository.save(user);
        return authService.toMeResponse(user);
    }

    @Transactional(readOnly = true)
    public StoredFile downloadAvatar() {
        AppUser user = currentUser();
        if (user.getAvatarPath() == null) {
            throw new NotFoundException("No profile photo uploaded");
        }
        Path path = uploadsRoot.resolve(user.getAvatarPath()).normalize();
        if (!path.startsWith(uploadsRoot) || !Files.exists(path)) {
            throw new NotFoundException("Profile photo not found");
        }
        return new StoredFile(path, user.getAvatarOriginalName() != null ? user.getAvatarOriginalName() : "avatar");
    }

    private void deleteExistingFile(AppUser user) {
        if (user.getAvatarPath() == null) {
            return;
        }
        try {
            Path existing = uploadsRoot.resolve(user.getAvatarPath()).normalize();
            if (existing.startsWith(uploadsRoot)) {
                Files.deleteIfExists(existing);
            }
        } catch (IOException ignored) {
            // Best-effort cleanup — a stale orphaned file on disk is not worth failing the request over.
        }
    }

    private AppUser currentUser() {
        return appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }
}
