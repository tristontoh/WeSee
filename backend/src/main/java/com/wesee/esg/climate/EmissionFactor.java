/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** Global emission-factor reference library (not tenant-scoped), mirrors IndicatorDefinition. */
@Entity
@Table(name = "emission_factor")
@Getter
@Setter
@NoArgsConstructor
public class EmissionFactor {

    @Id
    @Column(length = 40)
    private String id;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EmissionScope scope;

    @Column(name = "activity_unit", nullable = false, length = 30)
    private String activityUnit;

    @Column(name = "factor_value", nullable = false, precision = 14, scale = 6)
    private BigDecimal factorValue;

    @Column(nullable = false, length = 200)
    private String source;

    @Column(name = "source_year", nullable = false)
    private Integer sourceYear;
}
