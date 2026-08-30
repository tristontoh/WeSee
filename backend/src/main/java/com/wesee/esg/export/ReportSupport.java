/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.export;

import com.wesee.esg.climate.dto.EmissionPointDto;
import com.wesee.esg.climate.dto.EmissionsResponse;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Shared helpers for the PDF report generators in this package — emissions lookups and content checksums. */
final class ReportSupport {

    private ReportSupport() {
    }

    static BigDecimal valueForYear(List<EmissionPointDto> points, int fiscalYear) {
        return points.stream()
                .filter(v -> v.fiscalYear() == fiscalYear)
                .map(EmissionPointDto::value)
                .findFirst()
                .orElse(null);
    }

    static BigDecimal scope3TotalForYear(EmissionsResponse emissions, int fiscalYear) {
        if (emissions == null) {
            return null;
        }
        return emissions.scope3().stream()
                .flatMap(cat -> cat.values().stream())
                .filter(v -> v.fiscalYear() == fiscalYear)
                .map(v -> v.value())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    static Map<UUID, BigDecimal> scope3ValueByCategoryId(EmissionsResponse emissions, int fiscalYear) {
        Map<UUID, BigDecimal> result = new HashMap<>();
        if (emissions == null) {
            return result;
        }
        for (var cat : emissions.scope3()) {
            cat.values().stream()
                    .filter(v -> v.fiscalYear() == fiscalYear)
                    .map(v -> v.value())
                    .findFirst()
                    .ifPresent(v -> result.put(cat.id(), v));
        }
        return result;
    }

    static String computeChecksum(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.substring(0, 12).toUpperCase(Locale.ROOT);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
