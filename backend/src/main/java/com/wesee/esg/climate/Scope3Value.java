/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import com.wesee.esg.common.TenantOwnedEntity;
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

import java.math.BigDecimal;

@Entity
@Table(name = "scope3_value", uniqueConstraints = @UniqueConstraint(columnNames = {"scope3_category_id", "fiscal_year"}))
@Getter
@Setter
@NoArgsConstructor
public class Scope3Value extends TenantOwnedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scope3_category_id", nullable = false)
    private Scope3Category category;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal value;
}
