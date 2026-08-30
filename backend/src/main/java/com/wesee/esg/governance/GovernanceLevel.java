/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.governance;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "governance_level", uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "level"}))
@Getter
@Setter
@NoArgsConstructor
public class GovernanceLevel extends TenantOwnedEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OversightLevel level;

    @Column(name = "role_title", nullable = false, length = 200)
    private String roleTitle;

    @Column(columnDefinition = "TEXT")
    private String description;
}
