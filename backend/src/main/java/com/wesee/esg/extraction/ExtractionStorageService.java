/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.extraction;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Local-disk storage for uploaded source documents, under uploads/extraction/{companyId}/{documentId}/.
 * Stored names are UUID-generated and the resolved path is checked against the uploads root — the
 * client's filename is never used to build a path. Same guards as IndicatorEvidenceService.
 */
@Service
public class ExtractionStorageService {

    static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "png", "jpg", "jpeg", "xlsx", "csv", "docx");
    static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024;

    private final Path uploadsRoot;

    public ExtractionStorageService(@Value("${wesee.uploads.dir}") String uploadsDir) {
        this.uploadsRoot = Paths.get(uploadsDir).toAbsolutePath().normalize();
    }

    public String store(UUID companyId, UUID documentId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds the 10MB limit");
        }
        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank()
                        ? file.getOriginalFilename() : "document");
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type: ." + extension);
        }

        try {
            Path dir = uploadsRoot.resolve(Paths.get("extraction", companyId.toString(), documentId.toString()));
            Files.createDirectories(dir);
            Path target = dir.resolve(UUID.randomUUID() + "-" + originalName).normalize();
            if (!target.startsWith(dir)) {
                throw new IllegalArgumentException("Invalid file name");
            }
            file.transferTo(target);
            return uploadsRoot.relativize(target).toString();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store document", e);
        }
    }

    public byte[] read(String relativePath) {
        try {
            return Files.readAllBytes(resolve(relativePath));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read stored document", e);
        }
    }

    public Path resolve(String relativePath) {
        Path path = uploadsRoot.resolve(relativePath).normalize();
        if (!path.startsWith(uploadsRoot)) {
            throw new IllegalArgumentException("Invalid stored path");
        }
        return path;
    }

    static String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }
}
