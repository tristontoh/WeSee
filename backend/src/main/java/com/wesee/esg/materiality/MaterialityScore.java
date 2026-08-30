/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.materiality;

import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.reference.SustainabilityMatter;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "materiality_score", uniqueConstraints = @UniqueConstraint(columnNames = {"assessment_id", "matter_id"}))
@Getter
@Setter
@NoArgsConstructor
public class MaterialityScore extends TenantOwnedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private MaterialityAssessment assessment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matter_id", nullable = false)
    private SustainabilityMatter matter;

    @Column(nullable = false)
    private Integer impact;

    @Column(nullable = false)
    private Integer influence;

    /** Optional evidence/justification for the score — closes the audit-defensibility gap noted against Bursa's guide. */
    @Column(columnDefinition = "TEXT")
    private String rationale;
}
