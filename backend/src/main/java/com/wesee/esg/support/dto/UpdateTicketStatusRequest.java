/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.support.dto;

import com.wesee.esg.support.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTicketStatusRequest(@NotNull TicketStatus status) {
}
