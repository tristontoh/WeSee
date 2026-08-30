/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing;

import com.wesee.esg.billing.dto.InvoicePageResponse;
import com.wesee.esg.billing.dto.InvoiceResponse;
import com.wesee.esg.platform.PlatformSettings;
import com.wesee.esg.platform.PlatformSettingsRepository;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.security.SecretCryptoService;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InvoiceService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceService.class);

    private final InvoiceRepository invoiceRepository;
    private final CompanyRepository companyRepository;
    private final CurrentUserProvider currentUserProvider;
    private final PlatformSettingsRepository platformSettingsRepository;
    private final SecretCryptoService cryptoService;
    private final StripeClient stripeClient;

    public InvoiceService(InvoiceRepository invoiceRepository, CompanyRepository companyRepository, CurrentUserProvider currentUserProvider,
                           PlatformSettingsRepository platformSettingsRepository, SecretCryptoService cryptoService, StripeClient stripeClient) {
        this.invoiceRepository = invoiceRepository;
        this.companyRepository = companyRepository;
        this.currentUserProvider = currentUserProvider;
        this.platformSettingsRepository = platformSettingsRepository;
        this.cryptoService = cryptoService;
        this.stripeClient = stripeClient;
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> listAllInvoices() {
        return invoiceRepository.findAllByOrderByDueDateDescIdDesc().stream().map(this::toResponse).toList();
    }

    private static final int MAX_PAGE_SIZE = 100;

    /**
     * The caller's own company's invoices — paginated payment history shown in Settings > Billing.
     * Not read-only: backfills view/download links (see {@link #backfillStripeLinks}) for rows
     * recorded before those fields existed, so it needs to write.
     */
    @Transactional
    public InvoicePageResponse listForCurrentCompany(int page, int size) {
        UUID companyId = currentUserProvider.requireCompanyId();
        int clampedPage = Math.max(page, 0);
        int clampedSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(clampedPage, clampedSize);
        Page<Invoice> result = invoiceRepository.findByCompanyIdOrderByDueDateDesc(companyId, pageable);
        String secretKey = result.hasContent() ? stripeSecretKeyOrNull() : null;
        List<InvoiceResponse> content = result.getContent().stream()
                .map(invoice -> toResponse(backfillStripeLinks(invoice, secretKey)))
                .toList();
        return new InvoicePageResponse(content, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    /**
     * Rows recorded by StripeWebhookService before hostedInvoiceUrl/pdfUrl existed (or a row whose
     * webhook payload happened to omit them) get fetched once here and cached — every later call
     * finds them already set and skips straight past. Never throws: a Stripe hiccup here should
     * leave the invoice list rendering with those two links missing, not break the whole page.
     */
    private Invoice backfillStripeLinks(Invoice invoice, String secretKey) {
        if (secretKey == null || invoice.getStripeInvoiceId() == null
                || (invoice.getHostedInvoiceUrl() != null && invoice.getPdfUrl() != null)) {
            return invoice;
        }
        try {
            Map<String, Object> stripeInvoice = stripeClient.retrieveInvoice(secretKey, invoice.getStripeInvoiceId());
            Object hostedUrl = stripeInvoice.get("hosted_invoice_url");
            Object pdfUrl = stripeInvoice.get("invoice_pdf");
            invoice.setHostedInvoiceUrl(hostedUrl != null ? hostedUrl.toString() : null);
            invoice.setPdfUrl(pdfUrl != null ? pdfUrl.toString() : null);
            invoiceRepository.save(invoice);
        } catch (RuntimeException e) {
            log.warn("Couldn't backfill Stripe invoice links for invoice {}: {}", invoice.getId(), e.getClass().getSimpleName());
        }
        return invoice;
    }

    private String stripeSecretKeyOrNull() {
        PlatformSettings settings = platformSettingsRepository.findFirstByOrderByCreatedAtAsc().orElse(null);
        if (settings == null || !Boolean.TRUE.equals(settings.getStripeEnabled()) || settings.getStripeSecretKeyEncrypted() == null) {
            return null;
        }
        return cryptoService.decrypt(settings.getStripeSecretKeyEncrypted());
    }

    private InvoiceResponse toResponse(Invoice invoice) {
        String companyName = companyRepository.findById(invoice.getCompanyId())
                .map(Company::getName)
                .orElse(null);
        return InvoiceResponse.from(invoice, companyName);
    }
}
