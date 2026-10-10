/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** No rank column: rank is ORDER BY shares_held DESC, and a stored one drifts on every edit. */
@Entity
@Table(name = "shareholding")
@Getter
@Setter
@NoArgsConstructor
public class Shareholding extends TenantOwnedEntity {

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(name = "holder_name", nullable = false, length = 250)
    private String holderName;

    @Column(name = "shares_held", nullable = false, precision = 18, scale = 4)
    private BigDecimal sharesHeld;
}
