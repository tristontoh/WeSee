/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.support;

import com.wesee.esg.support.dto.CreateTicketMessageRequest;
import com.wesee.esg.support.dto.SupportTicketResponse;
import com.wesee.esg.support.dto.TicketMessageResponse;
import com.wesee.esg.support.dto.UpdateTicketNoteRequest;
import com.wesee.esg.support.dto.UpdateTicketStatusRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Platform-admin management of every tenant's feedback/support tickets. */
@RestController
@RequestMapping("/api/v1/admin/support-tickets")
@PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'SUPERADMIN')")
public class SupportTicketAdminController {

    private final SupportTicketService supportTicketService;
    private final TicketMessageService ticketMessageService;

    public SupportTicketAdminController(SupportTicketService supportTicketService, TicketMessageService ticketMessageService) {
        this.supportTicketService = supportTicketService;
        this.ticketMessageService = ticketMessageService;
    }

    @GetMapping
    public List<SupportTicketResponse> listAll() {
        return supportTicketService.listAllTickets();
    }

    @PatchMapping("/{id}/status")
    public SupportTicketResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateTicketStatusRequest request) {
        return supportTicketService.updateStatus(id, request);
    }

    @PatchMapping("/{id}/note")
    public SupportTicketResponse updateNote(@PathVariable UUID id, @Valid @RequestBody UpdateTicketNoteRequest request) {
        return supportTicketService.updateNote(id, request);
    }

    @GetMapping("/{id}/messages")
    public List<TicketMessageResponse> listMessages(@PathVariable UUID id) {
        return ticketMessageService.listMessages(id);
    }

    @PostMapping("/{id}/messages")
    public TicketMessageResponse postMessage(@PathVariable UUID id, @Valid @RequestBody CreateTicketMessageRequest request) {
        return ticketMessageService.postMessage(id, request);
    }
}
