/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing;

import com.wesee.esg.billing.dto.ChangePlanRequest;
import com.wesee.esg.billing.dto.ChangePlanResponse;
import com.wesee.esg.billing.dto.CheckoutSessionResponse;
import com.wesee.esg.billing.dto.ConfirmCheckoutResponse;
import com.wesee.esg.billing.dto.CreateCheckoutSessionRequest;
import com.wesee.esg.billing.dto.InvoicePageResponse;
import com.wesee.esg.billing.dto.NextBillingResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Self-serve plan management via Stripe — see CompanyBillingService for how first-payment checkout differs from an in-place upgrade/downgrade. */
@RestController
@RequestMapping("/api/v1/company/billing")
public class CompanyBillingController {

    private final CompanyBillingService service;
    private final InvoiceService invoiceService;

    public CompanyBillingController(CompanyBillingService service, InvoiceService invoiceService) {
        this.service = service;
        this.invoiceService = invoiceService;
    }

    @PostMapping("/checkout-session")
    public CheckoutSessionResponse createCheckoutSession(@Valid @RequestBody CreateCheckoutSessionRequest request) {
        return service.createCheckoutSession(request.targetPlan(), request.returnTo());
    }

    @PostMapping("/checkout-session/{sessionId}/confirm")
    public ConfirmCheckoutResponse confirmCheckout(@PathVariable String sessionId) {
        return service.confirmCheckout(sessionId);
    }

    @PostMapping("/change-plan")
    public ChangePlanResponse changePlan(@Valid @RequestBody ChangePlanRequest request) {
        return service.changeSubscriptionPlan(request.targetPlan());
    }

    @GetMapping("/invoices")
    public InvoicePageResponse listInvoices(@RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "10") int size) {
        return invoiceService.listForCurrentCompany(page, size);
    }

    @GetMapping("/next-billing")
    public NextBillingResponse nextBillingDate() {
        return service.getNextBillingDate();
    }
}
