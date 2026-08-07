package com.wesee.esg.targets;

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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Standalone strategic target (e.g. "30% Scope 1/2 reduction by 2030"), distinct from the
 * per-indicator target already carried on {@link com.wesee.esg.indicators.TenantIndicator}.
 * Optionally linked to a specific indicator for context, but not required.
 */
@Entity
@Table(name = "performance_target")
@Getter
@Setter
@NoArgsConstructor
public class PerformanceTarget extends TenantOwnedEntity {

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "baseline_year", nullable = false)
    private Integer baselineYear;

    @Column(name = "target_year", nullable = false)
    private Integer targetYear;

    @Column(name = "target_value", nullable = false, precision = 18, scale = 4)
    private BigDecimal targetValue;

    @Column(name = "current_progress", nullable = false)
    private Integer currentProgress = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "indicator_definition_id")
    private IndicatorDefinition indicatorDefinition;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private TargetHorizon horizon = TargetHorizon.NEAR_TERM;
}
