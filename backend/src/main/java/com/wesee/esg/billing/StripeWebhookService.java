package com.wesee.esg.billing;

import com.wesee.esg.activitylog.ActivityEventType;
import com.wesee.esg.activitylog.PlatformActivityLogService;
import com.wesee.esg.common.exceptions.ForbiddenException;
import com.wesee.esg.platform.PlatformSettings;
import com.wesee.esg.platform.PlatformSettingsRepository;
import com.wesee.esg.security.SecretCryptoService;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * Handles Stripe webhook events, closing two loops the rest of this billing code leaves open:
 * <ul>
 *   <li>"customer.subscription.deleted" — Stripe's terminal signal that a subscription is fully
 *       cancelled (customer-initiated or after Stripe's own dunning retries are exhausted).
 *       CompanyBillingService only ever sets {@code trialConverted = true}; this is what sets it
 *       back to {@code false} again.</li>
 *   <li>"invoice.payment_succeeded" (and "invoice.paid" for compatibility — see the switch below
 *       for which one a real checkout actually fires) — records a real Invoice row (the same
 *       entity InvoiceAdminController's admin view already reads) so Settings > Billing has an
 *       actual payment history table instead of nothing. Upserted by stripeInvoiceId since
 *       webhooks can be redelivered.</li>
 * </ul>
 * Every other event type is acknowledged and ignored.
 */
@Service
public class StripeWebhookService {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookService.class);

    private final PlatformSettingsRepository platformSettingsRepository;
    private final SecretCryptoService cryptoService;
    private final StripeWebhookVerifier verifier;
    private final CompanyRepository companyRepository;
    private final InvoiceRepository invoiceRepository;
    private final PlatformActivityLogService activityLogService;
    private final ObjectMapper objectMapper;

    public StripeWebhookService(PlatformSettingsRepository platformSettingsRepository,
                                 SecretCryptoService cryptoService,
                                 StripeWebhookVerifier verifier,
                                 CompanyRepository companyRepository,
                                 InvoiceRepository invoiceRepository,
                                 PlatformActivityLogService activityLogService,
                                 ObjectMapper objectMapper) {
        this.platformSettingsRepository = platformSettingsRepository;
        this.cryptoService = cryptoService;
        this.verifier = verifier;
        this.companyRepository = companyRepository;
        this.invoiceRepository = invoiceRepository;
        this.activityLogService = activityLogService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void handleEvent(String rawBody, String signatureHeader) {
        PlatformSettings settings = platformSettingsRepository.findFirstByOrderByCreatedAtAsc().orElse(null);
        if (settings == null || settings.getStripeWebhookSecretEncrypted() == null) {
            log.warn("Received a Stripe webhook call but no webhook secret is configured — rejecting");
            throw new ForbiddenException("Webhook not configured");
        }
        String webhookSecret = cryptoService.decrypt(settings.getStripeWebhookSecretEncrypted());

        if (!verifier.verify(rawBody, signatureHeader, webhookSecret)) {
            log.warn("Rejected a Stripe webhook call with an invalid signature");
            throw new ForbiddenException("Invalid Stripe webhook signature");
        }

        JsonNode event;
        try {
            event = objectMapper.readTree(rawBody);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Malformed webhook payload");
        }

        String type = event.path("type").asText("");
        JsonNode object = event.path("data").path("object");

        switch (type) {
            case "customer.subscription.deleted" -> handleSubscriptionDeleted(object);
            // Observed live (Stripe API 2025-06-30.basil): a real subscription checkout fires
            // "invoice.payment_succeeded" with the full Invoice object, plus "invoice_payment.paid"
            // (a newer, differently-shaped event on the separate Invoice Payment object) — but
            // "invoice.paid" itself never fired. Listening for payment_succeeded here since its
            // payload matches what handleInvoicePaid parses; upserting by stripeInvoiceId makes it
            // harmless if invoice.paid *does* also fire for some other flow.
            case "invoice.paid", "invoice.payment_succeeded" -> handleInvoicePaid(object);
            default -> { /* acknowledged, not acted on */ }
        }
    }

    private void handleSubscriptionDeleted(JsonNode object) {
        String customerId = object.path("customer").asText(null);
        if (customerId == null) {
            return;
        }
        companyRepository.findByStripeCustomerId(customerId).ifPresent(this::revokeTrialConversion);
    }

    private void revokeTrialConversion(Company company) {
        boolean wasConverted = Boolean.TRUE.equals(company.getTrialConverted());
        company.setTrialConverted(false);
        companyRepository.save(company);
        if (wasConverted) {
            activityLogService.record(company.getId(), company.getName(), ActivityEventType.TRIAL_REVOKED,
                    "Subscription cancelled via Stripe — access revoked");
        }
    }

    private void handleInvoicePaid(JsonNode object) {
        String customerId = object.path("customer").asText(null);
        String stripeInvoiceId = object.path("id").asText(null);
        if (customerId == null || stripeInvoiceId == null) {
            return;
        }
        Company company = companyRepository.findByStripeCustomerId(customerId).orElse(null);
        if (company == null) {
            return;
        }

        Invoice invoice = invoiceRepository.findByStripeInvoiceId(stripeInvoiceId).orElseGet(Invoice::new);
        invoice.setCompanyId(company.getId());
        invoice.setStripeInvoiceId(stripeInvoiceId);
        invoice.setInvoiceNumber(firstNonBlank(object.path("number").asText(null), stripeInvoiceId));
        invoice.setAmount(centsToRinggit(object.path("amount_paid").asLong(0)));
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setDueDate(epochSecondsToDate(firstNonNullLong(object, "due_date", "created")));
        invoice.setDescription(firstLineDescription(object, company));
        // Both are plain fields on the Invoice object already present in this webhook payload —
        // no extra Stripe call needed here (contrast InvoiceService.backfillStripeLinks, which
        // fetches these for rows recorded before this field existed).
        invoice.setHostedInvoiceUrl(object.path("hosted_invoice_url").asText(null));
        invoice.setPdfUrl(object.path("invoice_pdf").asText(null));

        invoiceRepository.save(invoice);
    }

    private String firstLineDescription(JsonNode invoiceObject, Company company) {
        JsonNode firstLine = invoiceObject.path("lines").path("data").path(0);
        String description = firstLine.path("description").asText(null);
        return description != null ? description : BillingProductName.of(company.getSubscriptionPlan());
    }

    private String firstNonBlank(String preferred, String fallback) {
        return preferred != null && !preferred.isBlank() ? preferred : fallback;
    }

    private long firstNonNullLong(JsonNode object, String preferredField, String fallbackField) {
        JsonNode preferred = object.path(preferredField);
        if (!preferred.isMissingNode() && !preferred.isNull()) {
            return preferred.asLong();
        }
        return object.path(fallbackField).asLong();
    }

    private LocalDate epochSecondsToDate(long epochSeconds) {
        return Instant.ofEpochSecond(epochSeconds).atZone(ZoneOffset.UTC).toLocalDate();
    }

    private BigDecimal centsToRinggit(long cents) {
        return BigDecimal.valueOf(cents, 2);
    }
}
