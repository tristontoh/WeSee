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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * A logged activity-data calculation (e.g. "1000 liters diesel"). calculatedTco2e is stored
 * rather than recomputed live, preserving what was actually calculated even if the underlying
 * EmissionFactor is revised later — same audit-trail principle as IndicatorAuditEntry.
 */
@Entity
@Table(name = "emission_activity_entry")
@Getter
@Setter
@NoArgsConstructor
public class EmissionActivityEntry extends TenantOwnedEntity {

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emission_factor_id", nullable = false)
    private EmissionFactor emissionFactor;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal quantity;

    @Column(name = "calculated_tco2e", nullable = false, precision = 18, scale = 4)
    private BigDecimal calculatedTco2e;
}
