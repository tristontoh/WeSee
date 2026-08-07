package com.wesee.esg.support;

import com.wesee.esg.common.exceptions.ForbiddenException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.support.dto.CreateSupportTicketRequest;
import com.wesee.esg.support.dto.SupportTicketResponse;
import com.wesee.esg.support.dto.UpdateSupportTicketRequest;
import com.wesee.esg.support.dto.UpdateTicketNoteRequest;
import com.wesee.esg.support.dto.UpdateTicketStatusRequest;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class SupportTicketService {

    private final SupportTicketRepository supportTicketRepository;
    private final AppUserRepository appUserRepository;
    private final CompanyRepository companyRepository;
    private final CurrentUserProvider currentUserProvider;

    public SupportTicketService(SupportTicketRepository supportTicketRepository,
                                 AppUserRepository appUserRepository,
                                 CompanyRepository companyRepository,
                                 CurrentUserProvider currentUserProvider) {
        this.supportTicketRepository = supportTicketRepository;
        this.appUserRepository = appUserRepository;
        this.companyRepository = companyRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public SupportTicketResponse createTicket(CreateSupportTicketRequest request) {
        UUID userId = currentUserProvider.getPrincipal().userId();
        AppUser submitter = appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        SupportTicket ticket = new SupportTicket();
        ticket.setCompanyId(currentUserProvider.requireCompanyId());
        ticket.setSubmittedBy(submitter);
        ticket.setType(request.type());
        ticket.setSubject(request.subject());
        ticket.setMessage(request.message());
        ticket.setPriority(request.priority() != null ? request.priority() : TicketPriority.LOW);
        ticket.setStatus(TicketStatus.OPEN);

        return toResponse(supportTicketRepository.save(ticket));
    }

    @Transactional(readOnly = true)
    public List<SupportTicketResponse> listMyTickets() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return supportTicketRepository.findByCompanyId(companyId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public SupportTicketResponse updateMyTicket(UUID id, UpdateSupportTicketRequest request) {
        SupportTicket ticket = supportTicketRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ticket not found"));

        UUID userId = currentUserProvider.getPrincipal().userId();
        if (!ticket.getSubmittedBy().getId().equals(userId)) {
            throw new ForbiddenException("Only the original submitter can edit this ticket");
        }
        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new ForbiddenException("This ticket can no longer be edited");
        }

        ticket.setSubject(request.subject());
        ticket.setMessage(request.message());
        return toResponse(supportTicketRepository.save(ticket));
    }

    @Transactional(readOnly = true)
    public List<SupportTicketResponse> listAllTickets() {
        return supportTicketRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public SupportTicketResponse updateStatus(UUID id, UpdateTicketStatusRequest request) {
        SupportTicket ticket = supportTicketRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ticket not found"));
        ticket.setStatus(request.status());
        return toResponse(supportTicketRepository.save(ticket));
    }

    /** The note is shared between the company and platform admin — either side may edit it. */
    @Transactional
    public SupportTicketResponse updateNote(UUID id, UpdateTicketNoteRequest request) {
        SupportTicket ticket = supportTicketRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ticket not found"));
        ticket.setNote(request.note());
        return toResponse(supportTicketRepository.save(ticket));
    }

    private SupportTicketResponse toResponse(SupportTicket ticket) {
        String companyName = companyRepository.findById(ticket.getCompanyId())
                .map(Company::getName)
                .orElse(null);
        return SupportTicketResponse.from(ticket, companyName);
    }
}
