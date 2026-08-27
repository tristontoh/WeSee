package com.wesee.esg.billing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/**
 * Calls Stripe's REST API directly — no SDK, matching this codebase's AI provider clients
 * (GeminiClient et al). Stripe's API takes classic PHP-style form-urlencoded bodies (bracket
 * notation for nested fields, e.g. {@code line_items[0][price_data][currency]}) rather than JSON —
 * callers build that as a flat {@link MultiValueMap} of pre-bracketed keys.
 */
@Service
public class StripeClient {

    private static final Logger log = LoggerFactory.getLogger(StripeClient.class);
    private static final String API_BASE = "https://api.stripe.com/v1";

    private final RestClient restClient;

    public StripeClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(20_000);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public Map<String, Object> createCheckoutSession(String secretKey, MultiValueMap<String, String> params) {
        return post(secretKey, "/checkout/sessions", params);
    }

    public Map<String, Object> retrieveCheckoutSession(String secretKey, String sessionId) {
        return get(secretKey, "/checkout/sessions/" + sessionId);
    }

    public Map<String, Object> retrieveSubscription(String secretKey, String subscriptionId) {
        return get(secretKey, "/subscriptions/" + subscriptionId);
    }

    /** Used only to backfill hosted_invoice_url/invoice_pdf on Invoice rows recorded before those fields existed — see InvoiceService.backfillStripeLinks. */
    public Map<String, Object> retrieveInvoice(String secretKey, String invoiceId) {
        return get(secretKey, "/invoices/" + invoiceId);
    }

    /**
     * Unlike Checkout Session line items, the subscription-update endpoint's inline
     * {@code price_data} doesn't accept {@code product_data} (creating a product ad hoc) — it
     * requires an existing product id via {@code price_data[product]}. See
     * CompanyBillingService.ensureStripeProduct, which creates one per plan tier and reuses it.
     */
    public String createProduct(String secretKey, String name) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("name", name);
        Map<String, Object> product = post(secretKey, "/products", params);
        Object id = product.get("id");
        if (id == null) {
            throw new StripeException("Stripe didn't return a product id");
        }
        return id.toString();
    }

    /** Changes the price on an existing subscription in place (one subscription for the life of the account) rather than creating a parallel one — see CompanyBillingService.changeSubscriptionPlan. */
    public Map<String, Object> updateSubscription(String secretKey, String subscriptionId, MultiValueMap<String, String> params) {
        return post(secretKey, "/subscriptions/" + subscriptionId, params);
    }

    private Map<String, Object> post(String secretKey, String path, MultiValueMap<String, String> body) {
        try {
            Map<String, Object> response = restClient.post()
                    .uri(API_BASE + path)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            if (response == null) {
                throw new StripeException("Stripe returned an empty response");
            }
            return response;
        } catch (RestClientException e) {
            throw wrap(e);
        }
    }

    private Map<String, Object> get(String secretKey, String path) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri(API_BASE + path)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + secretKey)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            if (response == null) {
                throw new StripeException("Stripe returned an empty response");
            }
            return response;
        } catch (RestClientException e) {
            throw wrap(e);
        }
    }

    // Deliberately never propagate e.getMessage() — Spring's exception messages commonly embed
    // the full request URI, and the secret key is sent as a Bearer header rather than a query
    // param specifically so it can never end up there, but keep this habit regardless.
    private StripeException wrap(RestClientException e) {
        String status = e instanceof HttpStatusCodeException httpEx ? " (HTTP " + httpEx.getStatusCode().value() + ")" : "";
        log.warn("Stripe request failed{}: {}", status, e.getClass().getSimpleName());
        return new StripeException("Stripe request failed" + status + " — check your Stripe API keys in Platform Settings", e);
    }
}
