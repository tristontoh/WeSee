package com.wesee.esg.indicators;

import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.reference.IndicatorDefinition;
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

/**
 * Current value for one calendar month of a fiscal year (upserted on save) — the raw input that
 * {@link IndicatorService#computeAnnualValue} rolls up into the disclosure-facing
 * {@link IndicatorValue} per the indicator's {@link com.wesee.esg.reference.AggregationRule}.
 * Correction history lives in {@link IndicatorAuditEntry} (via its {@code month} field), not here.
 */
@Entity
@Table(name = "indicator_monthly_value", uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "indicator_definition_id", "fiscal_year", "month"}))
@Getter
@Setter
@NoArgsConstructor
public class IndicatorMonthlyValue extends TenantOwnedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "indicator_definition_id", nullable = false)
    private IndicatorDefinition indicatorDefinition;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(nullable = false)
    private Integer month;

    @Column(precision = 18, scale = 4)
    private BigDecimal value;
}
