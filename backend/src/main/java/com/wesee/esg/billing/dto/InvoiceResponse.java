package com.wesee.esg.billing.dto;

import com.wesee.esg.billing.Invoice;
import com.wesee.esg.billing.InvoiceStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record InvoiceResponse(
        UUID id,
        String invoiceNumber,
        UUID companyId,
        String companyName,
        LocalDate dueDate,
        BigDecimal amount,
        InvoiceStatus status,
        Instant createdAt
) {
    public static InvoiceResponse from(Invoice invoice, String companyName) {
        return new InvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getCompanyId(),
                companyName,
                invoice.getDueDate(),
                invoice.getAmount(),
                invoice.getStatus(),
                invoice.getCreatedAt()
        );
    }
}
