/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing;

import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

class StripeWebhookVerifierTest {

    private final StripeWebhookVerifier verifier = new StripeWebhookVerifier();
    private static final String SECRET = "whsec_test_secret_1234567890";
    private static final String PAYLOAD = "{\"id\":\"evt_test_webhook\",\"type\":\"customer.subscription.deleted\"}";

    /** Mirrors exactly what Stripe itself computes, so these tests validate against an independent implementation, not just "my code agrees with itself". */
    private String sign(String payload, long timestamp, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void acceptsAValidSignature() {
        Instant now = Instant.parse("2026-08-27T00:00:00Z");
        long timestamp = now.getEpochSecond();
        String header = "t=" + timestamp + ",v1=" + sign(PAYLOAD, timestamp, SECRET);

        assertThat(verifier.verify(PAYLOAD, header, SECRET, now, 300)).isTrue();
    }

    @Test
    void acceptsWhenMultipleV1SignaturesArePresentAndAnyOneMatches() {
        Instant now = Instant.parse("2026-08-27T00:00:00Z");
        long timestamp = now.getEpochSecond();
        String realSig = sign(PAYLOAD, timestamp, SECRET);
        String header = "t=" + timestamp + ",v1=deadbeef,v1=" + realSig;

        assertThat(verifier.verify(PAYLOAD, header, SECRET, now, 300)).isTrue();
    }

    @Test
    void rejectsWhenPayloadWasTamperedAfterSigning() {
        Instant now = Instant.parse("2026-08-27T00:00:00Z");
        long timestamp = now.getEpochSecond();
        String header = "t=" + timestamp + ",v1=" + sign(PAYLOAD, timestamp, SECRET);

        String tamperedPayload = PAYLOAD.replace("deleted", "created");
        assertThat(verifier.verify(tamperedPayload, header, SECRET, now, 300)).isFalse();
    }

    @Test
    void rejectsWhenSignedWithTheWrongSecret() {
        Instant now = Instant.parse("2026-08-27T00:00:00Z");
        long timestamp = now.getEpochSecond();
        String header = "t=" + timestamp + ",v1=" + sign(PAYLOAD, timestamp, "whsec_a_completely_different_secret");

        assertThat(verifier.verify(PAYLOAD, header, SECRET, now, 300)).isFalse();
    }

    @Test
    void rejectsAStaleTimestampEvenWithACorrectSignature() {
        Instant now = Instant.parse("2026-08-27T00:00:00Z");
        long oldTimestamp = now.minusSeconds(3600).getEpochSecond();
        String header = "t=" + oldTimestamp + ",v1=" + sign(PAYLOAD, oldTimestamp, SECRET);

        assertThat(verifier.verify(PAYLOAD, header, SECRET, now, 300)).isFalse();
    }

    @Test
    void rejectsAMalformedHeader() {
        Instant now = Instant.parse("2026-08-27T00:00:00Z");
        assertThat(verifier.verify(PAYLOAD, "not-a-valid-header", SECRET, now, 300)).isFalse();
        assertThat(verifier.verify(PAYLOAD, "", SECRET, now, 300)).isFalse();
    }

    @Test
    void rejectsWhenWebhookSecretIsBlank() {
        Instant now = Instant.parse("2026-08-27T00:00:00Z");
        long timestamp = now.getEpochSecond();
        String header = "t=" + timestamp + ",v1=" + sign(PAYLOAD, timestamp, SECRET);

        assertThat(verifier.verify(PAYLOAD, header, "", now, 300)).isFalse();
    }
}
