package com.wesee.esg.indicators;

import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.reference.IndicatorDefinition;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "indicator_value", uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "indicator_definition_id", "fiscal_year"}))
@Getter
@Setter
@NoArgsConstructor
public class IndicatorValue extends TenantOwnedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "indicator_definition_id", nullable = false)
    private IndicatorDefinition indicatorDefinition;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(precision = 18, scale = 4)
    private BigDecimal value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IndicatorValueStatus status = IndicatorValueStatus.DRAFT;

    @Column(name = "approved_by_name", length = 200)
    private String approvedByName;

    @Column(name = "approved_at")
    private Instant approvedAt;

    /** True when this value was rolled up from IndicatorMonthlyValue rows rather than hand-entered. */
    @Column(name = "is_computed", nullable = false)
    private Boolean computed = false;
}
