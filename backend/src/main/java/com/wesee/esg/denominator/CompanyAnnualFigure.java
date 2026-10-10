/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * One denominator, for one company, for one fiscal year. Revenue and headcount change annually, so
 * none of this hangs off {@code company} as a column — a 2025 intensity computed against a 2026
 * revenue is simply wrong.
 */
@Entity
@Table(name = "company_annual_figure")
@Getter
@Setter
@NoArgsConstructor
public class CompanyAnnualFigure extends TenantOwnedEntity {

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "figure_key", nullable = false, length = 40)
    private AnnualFigureKey figureKey;

    @Column(name = "value", nullable = false, precision = 18, scale = 4)
    private BigDecimal value;

    @Column(name = "unit", nullable = false, length = 30)
    private String unit;

    @Column(name = "source_note", columnDefinition = "TEXT")
    private String sourceNote;
}
