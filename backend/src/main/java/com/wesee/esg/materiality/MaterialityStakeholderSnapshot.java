/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.materiality;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "materiality_stakeholder_snapshot")
@Getter
@Setter
@NoArgsConstructor
public class MaterialityStakeholderSnapshot extends TenantOwnedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private MaterialityAssessment assessment;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
}
