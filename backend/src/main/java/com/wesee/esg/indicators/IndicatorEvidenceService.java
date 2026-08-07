package com.wesee.esg.indicators;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.indicators.dto.AuditEntryDto;
import com.wesee.esg.security.CurrentUserProvider;
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

/**
 * Local-disk evidence storage for indicator value audit entries. No S3/cloud dependency — matches
 * this app's current dev-sandbox scope. Files are stored under a UUID-generated name; the client's
 * original filename is never used to build a filesystem path (avoids path traversal).
 */
@Service
public class IndicatorEvidenceService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "png", "jpg", "jpeg", "xlsx", "csv", "docx");
    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024;

    private final IndicatorAuditEntryRepository auditEntryRepository;
    private final CurrentUserProvider currentUserProvider;
    private final Path uploadsRoot;

    public IndicatorEvidenceService(IndicatorAuditEntryRepository auditEntryRepository,
                                     CurrentUserProvider currentUserProvider,
                                     @Value("${wesee.uploads.dir}") String uploadsDir) {
        this.auditEntryRepository = auditEntryRepository;
        this.currentUserProvider = currentUserProvider;
        this.uploadsRoot = Paths.get(uploadsDir).toAbsolutePath().normalize();
    }

    @Transactional
    public AuditEntryDto attachEvidence(UUID auditEntryId, MultipartFile file) {
        UUID companyId = currentUserProvider.requireCompanyId();
        IndicatorAuditEntry entry = auditEntryRepository.findByIdAndCompanyId(auditEntryId, companyId)
                .orElseThrow(() -> new NotFoundException("Audit entry not found"));

        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds the 10MB limit");
        }
        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank() ? file.getOriginalFilename() : "evidence");
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type: ." + extension);
        }

        try {
            Path dir = uploadsRoot.resolve(Paths.get("indicators", companyId.toString(),
                    entry.getIndicatorDefinition().getId(), String.valueOf(entry.getFiscalYear())));
            Files.createDirectories(dir);

            String storedName = UUID.randomUUID() + "-" + originalName;
            Path target = dir.resolve(storedName).normalize();
            if (!target.startsWith(dir)) {
                throw new IllegalArgumentException("Invalid file name");
            }
            file.transferTo(target);

            entry.setSourceDocName(originalName);
            entry.setSourceDocPath(uploadsRoot.relativize(target).toString());
            auditEntryRepository.save(entry);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store evidence file", e);
        }

        return AuditEntryDto.from(entry);
    }

    @Transactional(readOnly = true)
    public StoredFile downloadEvidence(UUID auditEntryId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        IndicatorAuditEntry entry = auditEntryRepository.findByIdAndCompanyId(auditEntryId, companyId)
                .orElseThrow(() -> new NotFoundException("Audit entry not found"));
        if (entry.getSourceDocPath() == null) {
            throw new NotFoundException("No evidence file attached to this entry");
        }

        Path path = uploadsRoot.resolve(entry.getSourceDocPath()).normalize();
        if (!path.startsWith(uploadsRoot) || !Files.exists(path)) {
            throw new NotFoundException("Evidence file not found");
        }
        return new StoredFile(path, entry.getSourceDocName());
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }

    public record StoredFile(Path path, String originalFileName) {
    }
}
