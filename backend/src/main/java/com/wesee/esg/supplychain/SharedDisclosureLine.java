/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One activity entry behind a published total, frozen by value. Nothing here references
 * {@code emission_factor}: a line signed under the 2024 factor must keep reporting 0.585 after
 * MGTC publishes a 2025 edition.
 */
@Entity
@Table(name = "shared_disclosure_line")
@Getter
@Setter
@NoArgsConstructor
public class SharedDisclosureLine extends BaseEntity {

    @Column(name = "disclosure_id", nullable = false, updatable = false)
    private UUID disclosureId;

    @Column(name = "scope", nullable = false, length = 20)
    private String scope;

    @Column(name = "emission_factor_id", nullable = false, length = 40)
    private String emissionFactorId;

    @Column(name = "emission_factor_name", nullable = false, length = 200)
    private String emissionFactorName;

    @Column(name = "quantity", nullable = false, precision = 18, scale = 4)
    private BigDecimal quantity;

    @Column(name = "activity_unit", nullable = false, length = 30)
    private String activityUnit;

    @Column(name = "factor_value", nullable = false, precision = 14, scale = 6)
    private BigDecimal factorValue;

    @Column(name = "factor_source", nullable = false, length = 200)
    private String factorSource;

    @Column(name = "factor_source_year")
    private Integer factorSourceYear;

    @Column(name = "tco2e", nullable = false, precision = 18, scale = 4)
    private BigDecimal tco2e;
}
