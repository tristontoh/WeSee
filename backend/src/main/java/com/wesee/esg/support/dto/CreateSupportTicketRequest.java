/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.support.dto;

import com.wesee.esg.support.TicketPriority;
import com.wesee.esg.support.TicketType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSupportTicketRequest(
        @NotNull TicketType type,
        @NotBlank String subject,
        @NotBlank String message,
        TicketPriority priority
) {
}
