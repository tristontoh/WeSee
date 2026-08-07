package com.wesee.esg.assurance;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Append-only log of every sign/revoke action, mirroring {@code IndicatorAuditEntry}'s pattern. */
@Entity
@Table(name = "sign_off_audit_entry")
@Getter
@Setter
@NoArgsConstructor
public class SignOffAuditEntry extends TenantOwnedEntity {

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SignOffStatus action;

    @Column(name = "actor_name", nullable = false, length = 200)
    private String actorName;

    @Column(name = "actor_title", length = 200)
    private String actorTitle;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 64)
    private String hash;
}
