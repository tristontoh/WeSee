/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing;

import com.wesee.esg.billing.dto.InvoiceResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Platform-admin view of subscription billing invoices across every tenant. */
@RestController
@RequestMapping("/api/v1/admin/invoices")
@PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'SUPERADMIN')")
public class InvoiceAdminController {

    private final InvoiceService invoiceService;

    public InvoiceAdminController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping
    public List<InvoiceResponse> listAll() {
        return invoiceService.listAllInvoices();
    }
}
