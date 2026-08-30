/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "invoice")
@Getter
@Setter
@NoArgsConstructor
public class Invoice extends TenantOwnedEntity {

    @Column(name = "invoice_number", nullable = false, unique = true, length = 30)
    private String invoiceNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private InvoiceStatus status = InvoiceStatus.PENDING;

    /** Null for a hand-entered invoice; set for one synced from Stripe. The upsert key, because
        webhooks redeliver the same event. */
    @Column(name = "stripe_invoice_id", length = 255)
    private String stripeInvoiceId;

    @Column(length = 500)
    private String description;

    /** Stripe's hosted invoice page and generated PDF. */
    @Column(name = "hosted_invoice_url", length = 1000)
    private String hostedInvoiceUrl;

    @Column(name = "pdf_url", length = 1000)
    private String pdfUrl;

}
