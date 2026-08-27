package com.wesee.esg.billing.dto;

import java.util.List;

public record InvoicePageResponse(
        List<InvoiceResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
