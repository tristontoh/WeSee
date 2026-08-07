package com.wesee.esg.materiality;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Persistent, editable list of stakeholder groups per company (distinct from the read-only
 * snapshot captured into each {@link MaterialityAssessment}).
 */
@Entity
@Table(name = "stakeholder_option")
@Getter
@Setter
@NoArgsConstructor
public class StakeholderOption extends TenantOwnedEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private Boolean selected = true;

    @Column(name = "is_custom", nullable = false)
    private Boolean custom = false;
}
