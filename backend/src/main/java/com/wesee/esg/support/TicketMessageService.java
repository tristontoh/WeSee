/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.support;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.support.dto.CreateTicketMessageRequest;
import com.wesee.esg.support.dto.TicketMessageResponse;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class TicketMessageService {

    private final TicketMessageRepository ticketMessageRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final AppUserRepository appUserRepository;
    private final CurrentUserProvider currentUserProvider;

    public TicketMessageService(TicketMessageRepository ticketMessageRepository,
                                 SupportTicketRepository supportTicketRepository,
                                 AppUserRepository appUserRepository,
                                 CurrentUserProvider currentUserProvider) {
        this.ticketMessageRepository = ticketMessageRepository;
        this.supportTicketRepository = supportTicketRepository;
        this.appUserRepository = appUserRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public List<TicketMessageResponse> listMessages(UUID ticketId) {
        requireTicket(ticketId);
        return ticketMessageRepository.findByTicketIdOrderByCreatedAtAsc(ticketId).stream()
                .map(TicketMessageResponse::from)
                .toList();
    }

    @Transactional
    public TicketMessageResponse postMessage(UUID ticketId, CreateTicketMessageRequest request) {
        SupportTicket ticket = requireTicket(ticketId);

        UUID userId = currentUserProvider.getPrincipal().userId();
        AppUser sender = appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        TicketMessage message = new TicketMessage();
        message.setCompanyId(ticket.getCompanyId());
        message.setTicketId(ticketId);
        message.setSender(sender);
        message.setMessage(request.message());

        return TicketMessageResponse.from(ticketMessageRepository.save(message));
    }

    /**
     * The ticket, if this caller may reach it.
     *
     * <p>Not found rather than forbidden on a mismatch: telling a caller that a ticket exists but
     * belongs to someone else is itself a disclosure, and a ticket id is a guessable path variable.
     */
    private SupportTicket requireTicket(UUID ticketId) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("Ticket not found"));
        var principal = currentUserProvider.getPrincipal();
        if (!TicketAccessGuard.canReach(ticket.getCompanyId(), principal.companyId(), principal.role())) {
            throw new NotFoundException("Ticket not found");
        }
        return ticket;
    }
}
