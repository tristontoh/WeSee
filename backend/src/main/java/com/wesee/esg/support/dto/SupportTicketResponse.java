/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.support.dto;

import com.wesee.esg.support.SupportTicket;
import com.wesee.esg.support.TicketPriority;
import com.wesee.esg.support.TicketStatus;
import com.wesee.esg.support.TicketType;

import java.time.Instant;
import java.util.UUID;

public record SupportTicketResponse(
        UUID id,
        TicketType type,
        String subject,
        String message,
        TicketPriority priority,
        TicketStatus status,
        Instant createdAt,
        UUID submittedByUserId,
        String submittedByName,
        String submittedByEmail,
        String companyName,
        String note
) {
    public static SupportTicketResponse from(SupportTicket t, String companyName) {
        return new SupportTicketResponse(
                t.getId(),
                t.getType(),
                t.getSubject(),
                t.getMessage(),
                t.getPriority(),
                t.getStatus(),
                t.getCreatedAt(),
                t.getSubmittedBy().getId(),
                t.getSubmittedBy().getName(),
                t.getSubmittedBy().getEmail(),
                companyName,
                t.getNote()
        );
    }
}
