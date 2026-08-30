/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

/**
 * Verifies a Stripe webhook's {@code Stripe-Signature} header against the raw request body, per
 * Stripe's documented scheme (https://docs.stripe.com/webhooks#verify-manually) — implemented
 * directly rather than via the Stripe SDK, matching this codebase's "no SDK" convention for
 * external APIs. The header looks like {@code t=1614556800,v1=<hex>,v0=<hex>}: v0 is a legacy
 * SHA-1 signature we ignore, v1 is HMAC-SHA256 of {@code "{timestamp}.{rawBody}"} keyed by the
 * webhook secret. Multiple v1 values can appear during Stripe secret rotation — any match is
 * accepted. A timestamp outside the tolerance window is rejected as a possible replay.
 */
@Component
public class StripeWebhookVerifier {

    private static final long DEFAULT_TOLERANCE_SECONDS = 300;

    public boolean verify(String rawBody, String signatureHeader, String webhookSecret) {
        return verify(rawBody, signatureHeader, webhookSecret, Instant.now(), DEFAULT_TOLERANCE_SECONDS);
    }

    boolean verify(String rawBody, String signatureHeader, String webhookSecret, Instant now, long toleranceSeconds) {
        if (rawBody == null || signatureHeader == null || webhookSecret == null || webhookSecret.isBlank()) {
            return false;
        }

        String timestamp = null;
        List<String> v1Signatures = new ArrayList<>();
        for (String part : signatureHeader.split(",")) {
            String[] kv = part.split("=", 2);
            if (kv.length != 2) {
                continue;
            }
            if ("t".equals(kv[0])) {
                timestamp = kv[1];
            } else if ("v1".equals(kv[0])) {
                v1Signatures.add(kv[1]);
            }
        }
        if (timestamp == null || v1Signatures.isEmpty()) {
            return false;
        }

        long eventEpochSeconds;
        try {
            eventEpochSeconds = Long.parseLong(timestamp);
        } catch (NumberFormatException e) {
            return false;
        }
        if (Math.abs(now.getEpochSecond() - eventEpochSeconds) > toleranceSeconds) {
            return false;
        }

        String expected = hmacSha256Hex(timestamp + "." + rawBody, webhookSecret);
        for (String candidate : v1Signatures) {
            if (constantTimeEquals(expected, candidate)) {
                return true;
            }
        }
        return false;
    }

    private String hmacSha256Hex(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA256 is unavailable", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
