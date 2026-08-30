/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.support;

import com.wesee.esg.support.dto.CreateSupportTicketRequest;
import com.wesee.esg.support.dto.CreateTicketMessageRequest;
import com.wesee.esg.support.dto.SupportTicketResponse;
import com.wesee.esg.support.dto.TicketMessageResponse;
import com.wesee.esg.support.dto.UpdateSupportTicketRequest;
import com.wesee.esg.support.dto.UpdateTicketNoteRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Tenant-facing feedback/support ticket creation and self-service tracking. */
@RestController
@RequestMapping("/api/v1/support-tickets")
public class SupportTicketController {

    private final SupportTicketService supportTicketService;
    private final TicketMessageService ticketMessageService;

    public SupportTicketController(SupportTicketService supportTicketService, TicketMessageService ticketMessageService) {
        this.supportTicketService = supportTicketService;
        this.ticketMessageService = ticketMessageService;
    }

    @PostMapping
    public ResponseEntity<SupportTicketResponse> create(@Valid @RequestBody CreateSupportTicketRequest request) {
        return ResponseEntity.ok(supportTicketService.createTicket(request));
    }

    @GetMapping
    public List<SupportTicketResponse> listMine() {
        return supportTicketService.listMyTickets();
    }

    @PatchMapping("/{id}")
    public SupportTicketResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateSupportTicketRequest request) {
        return supportTicketService.updateMyTicket(id, request);
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
