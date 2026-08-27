package com.wesee.esg.billing;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Called directly by Stripe's servers, never by the app's own frontend — unauthenticated at the
 * Spring Security layer (see SecurityConfig's permitAll for /api/v1/webhooks/**); all trust comes
 * from {@link StripeWebhookVerifier}'s HMAC check inside the service, not from a JWT.
 *
 * Reads the raw servlet input stream directly rather than binding {@code @RequestBody String} —
 * signature verification needs the exact bytes Stripe signed, and for a request whose
 * Content-Type is application/json, Spring would otherwise hand the body to the JSON message
 * converter even for a String target, which expects a quoted JSON string literal and fails on a
 * raw JSON object body like Stripe sends.
 */
@RestController
@RequestMapping("/api/v1/webhooks/stripe")
public class StripeWebhookController {

    private final StripeWebhookService service;

    public StripeWebhookController(StripeWebhookService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<String> handle(HttpServletRequest request, @RequestHeader("Stripe-Signature") String signature) throws IOException {
        String rawBody = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        service.handleEvent(rawBody, signature);
        return ResponseEntity.ok("ok");
    }
}
