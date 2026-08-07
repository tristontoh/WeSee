package com.wesee.esg.support;

import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "support_ticket")
@Getter
@Setter
@NoArgsConstructor
public class SupportTicket extends TenantOwnedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by", nullable = false)
    private AppUser submittedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TicketType type;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TicketPriority priority = TicketPriority.LOW;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TicketStatus status = TicketStatus.OPEN;

    /** Shared running note, visible to both the company and the platform admin handling the ticket. */
    @Column(columnDefinition = "TEXT")
    private String note;
}
