package com.wesee.esg.support.dto;

import com.wesee.esg.support.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTicketStatusRequest(@NotNull TicketStatus status) {
}
