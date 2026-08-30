/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing.dto;

import java.util.List;

public record InvoicePageResponse(
        List<InvoiceResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
