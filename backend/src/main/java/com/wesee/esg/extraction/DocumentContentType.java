/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.extraction;

import org.springframework.http.MediaType;

import java.util.Locale;
import java.util.Map;

/**
 * The type a stored document is served back as.
 *
 * <p>An explicit table rather than {@code URLConnection.guessContentTypeFromName}, which the
 * evidence download uses: that returns null for several of the extensions the upload allowlist
 * accepts, and a PDF served as octet-stream is downloaded by the browser instead of rendered —
 * which would defeat the preview it is being fetched for.
 */
final class DocumentContentType {

    private static final Map<String, MediaType> BY_EXTENSION = Map.of(
            "pdf", MediaType.APPLICATION_PDF,
            "png", MediaType.IMAGE_PNG,
            "jpg", MediaType.IMAGE_JPEG,
            "jpeg", MediaType.IMAGE_JPEG,
            "csv", MediaType.parseMediaType("text/csv"),
            "xlsx", MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            "docx", MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));

    private DocumentContentType() {
    }

    static MediaType forFileName(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        String extension = fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
        return BY_EXTENSION.getOrDefault(extension, MediaType.APPLICATION_OCTET_STREAM);
    }
}
