package com.wesee.esg.billing;

import com.wesee.esg.activitylog.ActivityEventType;
import com.wesee.esg.activitylog.PlatformActivityLogService;
import com.wesee.esg.billing.dto.ChangePlanResponse;
import com.wesee.esg.billing.dto.CheckoutSessionResponse;
import com.wesee.esg.billing.dto.ConfirmCheckoutResponse;
import com.wesee.esg.billing.dto.CreateCheckoutSessionRequest;
import com.wesee.esg.billing.dto.NextBillingResponse;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.ForbiddenException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.platform.PlatformSettings;
import com.wesee.esg.platform.PlatformSettingsRepository;
import com.wesee.esg.platform.PlatformSettingsService;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.security.SecretCryptoService;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.PlanPricing;
import com.wesee.esg.tenant.PlanPricingRepository;
import com.wesee.esg.tenant.SubscriptionPlan;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Self-serve plan management via Stripe. Two distinct paths depending on whether the company has
 * ever paid before (Company.stripeSubscriptionId is set):
 * <ul>
 *   <li>Never paid — {@link #createCheckoutSession} + {@link #confirmCheckout}, a hosted Stripe
 *       Checkout page (needed the first time since there's no saved payment method yet). No
 *       webhook for the confirm step: the platform's Stripe webhook secret being unset at launch
 *       meant confirmation had to happen by synchronously re-fetching the Checkout Session when
 *       the browser redirects back, rather than waiting on an async event — kept for consistency
 *       even now that a webhook exists (StripeWebhookService only handles cancellation/revocation).</li>
 *   <li>Already paying — {@link #changeSubscriptionPlan} modifies the existing subscription's
 *       price in place (with proration), so upgrading/downgrading never creates a second parallel
 *       subscription or a double-billing gap, and needs no checkout redirect at all.</li>
 * </ul>
 * Both paths keep {@code Company.subscriptionPlan} and {@code Company.marketClassification} in
 * sync (see {@link #marketFor}) — the rest of the app (matter-set resolution, indicator sets)
 * assumes those two are never out of step, same as onboarding's {@code AuthService.planForMarket}.
 */
@Service
public class CompanyBillingService {

    private final CompanyRepository companyRepository;
    private final PlanPricingRepository planPricingRepository;
    private final PlatformSettingsRepository platformSettingsRepository;
    private final PlatformSettingsService platformSettingsService;
    private final SecretCryptoService cryptoService;
    private final StripeClient stripeClient;
    private final CurrentUserProvider currentUserProvider;
    private final PlatformActivityLogService activityLogService;

    public CompanyBillingService(CompanyRepository companyRepository,
                                  PlanPricingRepository planPricingRepository,
                                  PlatformSettingsRepository platformSettingsRepository,
                                  PlatformSettingsService platformSettingsService,
                                  SecretCryptoService cryptoService,
                                  StripeClient stripeClient,
                                  CurrentUserProvider currentUserProvider,
                                  PlatformActivityLogService activityLogService) {
        this.companyRepository = companyRepository;
        this.planPricingRepository = planPricingRepository;
        this.platformSettingsRepository = platformSettingsRepository;
        this.platformSettingsService = platformSettingsService;
        this.cryptoService = cryptoService;
        this.stripeClient = stripeClient;
        this.currentUserProvider = currentUserProvider;
        this.activityLogService = activityLogService;
    }

    @Transactional(readOnly = true)
    public CheckoutSessionResponse createCheckoutSession(SubscriptionPlan targetPlan, CreateCheckoutSessionRequest.ReturnDestination returnTo) {
        UUID companyId = currentUserProvider.requireCompanyId();
        String secretKey = requireStripeSecretKey();

        PlanPricing pricing = planPricingRepository.findById(targetPlan)
                .orElseThrow(() -> new NotFoundException("No pricing configured for plan: " + targetPlan));

        String baseUrl = platformSettingsService.getEffectiveAppBaseUrl();
        String returnPath = returnTo == CreateCheckoutSessionRequest.ReturnDestination.TRIAL_EXPIRED
                ? "/trial-expired" : "/settings?tab=billing";
        String joiner = returnPath.contains("?") ? "&" : "?";
        String successUrl = baseUrl + returnPath + joiner + "checkout=success&session_id={CHECKOUT_SESSION_ID}";
        String cancelUrl = baseUrl + returnPath + joiner + "checkout=cancelled";

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("mode", "subscription");
        params.add("success_url", successUrl);
        params.add("cancel_url", cancelUrl);
        params.add("client_reference_id", companyId.toString());
        params.add("customer_email", currentUserProvider.getPrincipal().email());
        // Read back in confirmCheckout so it knows which plan to apply — this session might be
        // for a different plan than the company's current one (e.g. paying to start on Growth
        // directly, not just converting the current Starter trial).
        params.add("metadata[target_plan]", targetPlan.name());
        params.add("line_items[0][quantity]", "1");
        params.add("line_items[0][price_data][currency]", "myr");
        params.add("line_items[0][price_data][unit_amount]", toCents(pricing.getMonthlyPrice()));
        params.add("line_items[0][price_data][recurring][interval]", "month");
        params.add("line_items[0][price_data][product_data][name]", BillingProductName.of(targetPlan));

        Map<String, Object> session = stripeClient.createCheckoutSession(secretKey, params);
        Object url = session.get("url");
        if (url == null) {
            throw new StripeException("Stripe didn't return a checkout URL");
        }
        return new CheckoutSessionResponse(url.toString());
    }

    @Transactional
    public ConfirmCheckoutResponse confirmCheckout(String sessionId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        String secretKey = requireStripeSecretKey();

        Map<String, Object> session = stripeClient.retrieveCheckoutSession(secretKey, sessionId);
        Object clientReferenceId = session.get("client_reference_id");

        // A session belongs to exactly the company that created it — never trust a caller-supplied
        // sessionId without this check, or any authenticated user could confirm someone else's payment.
        if (clientReferenceId == null || !clientReferenceId.equals(companyId.toString())) {
            throw new ForbiddenException("This checkout session doesn't belong to your company");
        }

        Object paymentStatus = session.get("payment_status");
        if (!"paid".equals(paymentStatus)) {
            return new ConfirmCheckoutResponse(false, "Payment hasn't completed yet.");
        }

        // Locks the row for the rest of this transaction — if the browser fires this twice
        // concurrently for the same session (dev-mode double-effect, a double-click, two tabs),
        // the second call blocks here until the first commits, then re-reads its already-applied
        // state instead of racing it with a stale in-memory Company and clobbering the Stripe IDs
        // the first call just saved.
        Company company = companyRepository.findByIdForUpdate(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));
        boolean wasConverted = Boolean.TRUE.equals(company.getTrialConverted());
        SubscriptionPlan previousPlan = company.getSubscriptionPlan();
        company.setTrialConverted(true);
        // Stored so StripeWebhookController can map a later "subscription cancelled"/"payment
        // failed" event back to this company and revoke trialConverted again.
        Object customerId = session.get("customer");
        Object subscriptionId = session.get("subscription");
        if (customerId != null) {
            company.setStripeCustomerId(customerId.toString());
        }
        if (subscriptionId != null) {
            company.setStripeSubscriptionId(subscriptionId.toString());
        }

        SubscriptionPlan targetPlan = readTargetPlanFromMetadata(session);
        if (targetPlan != null && targetPlan != previousPlan) {
            company.setSubscriptionPlan(targetPlan);
            company.setMarketClassification(marketFor(targetPlan));
        }

        companyRepository.save(company);
        if (!wasConverted) {
            activityLogService.record(company.getId(), company.getName(), ActivityEventType.TRIAL_CONVERTED,
                    "Converted to paid via Stripe Checkout");
        }
        if (targetPlan != null && targetPlan != previousPlan) {
            activityLogService.record(company.getId(), company.getName(), ActivityEventType.PLAN_CHANGE,
                    "Subscription plan changed from " + previousPlan + " to " + targetPlan + " via self-service checkout");
        }

        return new ConfirmCheckoutResponse(true, "Payment confirmed — your account is now active.");
    }

    /**
     * Modifies the price on the company's existing Stripe subscription in place (with immediate
     * proration) instead of creating a second, parallel one — the correct way to handle an
     * upgrade/downgrade once someone already has a saved payment method on file.
     */
    @Transactional
    public ChangePlanResponse changeSubscriptionPlan(SubscriptionPlan targetPlan) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));

        if (company.getStripeSubscriptionId() == null) {
            throw new ConflictException("No active subscription to change — use Checkout to subscribe first");
        }
        if (company.getSubscriptionPlan() == targetPlan) {
            throw new IllegalArgumentException("Already on the " + targetPlan + " plan");
        }

        String secretKey = requireStripeSecretKey();
        PlanPricing pricing = planPricingRepository.findById(targetPlan)
                .orElseThrow(() -> new NotFoundException("No pricing configured for plan: " + targetPlan));

        Map<String, Object> subscription = stripeClient.retrieveSubscription(secretKey, company.getStripeSubscriptionId());
        String itemId = firstSubscriptionItemId(subscription);
        String productId = ensureStripeProduct(targetPlan, pricing, secretKey);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("items[0][id]", itemId);
        params.add("items[0][price_data][currency]", "myr");
        params.add("items[0][price_data][unit_amount]", toCents(pricing.getMonthlyPrice()));
        params.add("items[0][price_data][recurring][interval]", "month");
        // Unlike Checkout Session line items, this endpoint's inline price_data rejects
        // product_data (creating a product ad hoc) — confirmed live via Stripe: "Received unknown
        // parameter: items[0][price_data][product_data]". It requires an existing product id.
        params.add("items[0][price_data][product]", productId);
        // Charges/credits the prorated difference immediately rather than rolling it into the
        // next invoice — matches this app's "changes take effect immediately" behavior elsewhere
        // (e.g. PlanGateService re-reads the plan fresh on every request).
        params.add("proration_behavior", "always_invoice");

        stripeClient.updateSubscription(secretKey, company.getStripeSubscriptionId(), params);

        SubscriptionPlan previousPlan = company.getSubscriptionPlan();
        company.setSubscriptionPlan(targetPlan);
        company.setMarketClassification(marketFor(targetPlan));
        companyRepository.save(company);
        activityLogService.record(company.getId(), company.getName(), ActivityEventType.PLAN_CHANGE,
                "Subscription plan changed from " + previousPlan + " to " + targetPlan + " via self-service checkout");

        return new ChangePlanResponse(targetPlan, "Plan changed to " + targetPlan + ".");
    }

    @SuppressWarnings("unchecked")
    private SubscriptionPlan readTargetPlanFromMetadata(Map<String, Object> session) {
        Object metadata = session.get("metadata");
        if (!(metadata instanceof Map)) {
            return null;
        }
        Object targetPlan = ((Map<String, Object>) metadata).get("target_plan");
        if (targetPlan == null) {
            return null;
        }
        try {
            return SubscriptionPlan.valueOf(targetPlan.toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * The caller's own company's next billing date — read live from Stripe rather than stored,
     * since {@code changeSubscriptionPlan}'s proration can shift it. Null if the company has never
     * had an active subscription.
     */
    @Transactional(readOnly = true)
    public NextBillingResponse getNextBillingDate() {
        UUID companyId = currentUserProvider.requireCompanyId();
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));
        if (company.getStripeSubscriptionId() == null) {
            return new NextBillingResponse(null);
        }

        String secretKey = requireStripeSecretKey();
        Map<String, Object> subscription = stripeClient.retrieveSubscription(secretKey, company.getStripeSubscriptionId());
        // Stripe API 2025-06-30.basil moved current_period_end off the subscription object itself
        // and onto each subscription item (verified live via `stripe subscriptions list`) — same
        // items.data[0] path firstSubscriptionItemId already navigates for the item id.
        Object periodEnd = firstSubscriptionItem(subscription).get("current_period_end");
        if (!(periodEnd instanceof Number periodEndNumber)) {
            return new NextBillingResponse(null);
        }
        return new NextBillingResponse(epochSecondsToDate(periodEndNumber.longValue()));
    }

    /** Get-or-create — see PlanPricing.stripeProductId and StripeClient.createProduct for why this is needed. */
    private String ensureStripeProduct(SubscriptionPlan plan, PlanPricing pricing, String secretKey) {
        if (pricing.getStripeProductId() != null) {
            return pricing.getStripeProductId();
        }
        String productId = stripeClient.createProduct(secretKey, BillingProductName.of(plan));
        pricing.setStripeProductId(productId);
        planPricingRepository.save(pricing);
        return productId;
    }

    private String firstSubscriptionItemId(Map<String, Object> subscription) {
        Object id = firstSubscriptionItem(subscription).get("id");
        if (id == null) {
            throw new StripeException("Couldn't find a subscription item to update");
        }
        return id.toString();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> firstSubscriptionItem(Map<String, Object> subscription) {
        Object items = subscription.get("items");
        if (items instanceof Map) {
            Object data = ((Map<String, Object>) items).get("data");
            if (data instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> firstItem) {
                return (Map<String, Object>) firstItem;
            }
        }
        throw new StripeException("Couldn't find a subscription item");
    }

    private LocalDate epochSecondsToDate(long epochSeconds) {
        return Instant.ofEpochSecond(epochSeconds).atZone(ZoneOffset.UTC).toLocalDate();
    }

    private MarketClassification marketFor(SubscriptionPlan plan) {
        return switch (plan) {
            case STARTER -> MarketClassification.SME;
            case GROWTH -> MarketClassification.ACE_MARKET;
            case ISSUER_READY -> MarketClassification.MAIN_MARKET;
        };
    }

    private String requireStripeSecretKey() {
        PlatformSettings settings = platformSettingsRepository.findFirstByOrderByCreatedAtAsc()
                .orElseThrow(() -> new ConflictException("Stripe isn't configured yet — ask a platform admin to set it up in Platform Settings"));
        if (!Boolean.TRUE.equals(settings.getStripeEnabled()) || settings.getStripeSecretKeyEncrypted() == null) {
            throw new ConflictException("Stripe payments aren't enabled yet — ask a platform admin to enable them in Platform Settings");
        }
        return cryptoService.decrypt(settings.getStripeSecretKeyEncrypted());
    }

    private String toCents(BigDecimal ringgit) {
        return String.valueOf(ringgit.multiply(BigDecimal.valueOf(100)).intValueExact());
    }
}
