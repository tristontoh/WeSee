package com.wesee.esg.governance;

import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.reference.SustainabilityMatter;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "matter_ownership", uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "matter_id"}))
@Getter
@Setter
@NoArgsConstructor
public class MatterOwnership extends TenantOwnedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matter_id", nullable = false)
    private SustainabilityMatter matter;

    /** Free-text with autocomplete suggestions in the UI, not a hard FK to a user. */
    @Column(name = "owner_name", nullable = false, length = 200)
    private String ownerName;

    @Enumerated(EnumType.STRING)
    @Column(name = "oversight_level", nullable = false, length = 20)
    private OversightLevel oversightLevel;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
