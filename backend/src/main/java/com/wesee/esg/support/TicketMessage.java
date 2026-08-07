package com.wesee.esg.support;

import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** A single message in the 1:1 chat thread attached to a {@link SupportTicket}. */
@Entity
@Table(name = "ticket_message")
@Getter
@Setter
@NoArgsConstructor
public class TicketMessage extends TenantOwnedEntity {

    @Column(name = "ticket_id", nullable = false, updatable = false)
    private UUID ticketId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private AppUser sender;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;
}
