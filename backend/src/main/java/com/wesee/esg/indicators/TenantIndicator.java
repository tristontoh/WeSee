package com.wesee.esg.indicators;

import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.reference.IndicatorDefinition;
import com.wesee.esg.reference.TargetDirection;
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

/**
 * Per-company override of an {@link IndicatorDefinition}'s target/enabled state. Resolution of
 * the "effective target" is {@code tenantIndicator.target ?? indicatorDefinition.defaultTarget}.
 */
@Entity
@Table(name = "tenant_indicator", uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "indicator_definition_id"}))
@Getter
@Setter
@NoArgsConstructor
public class TenantIndicator extends TenantOwnedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "indicator_definition_id", nullable = false)
    private IndicatorDefinition indicatorDefinition;

    @Column(precision = 18, scale = 4)
    private BigDecimal target;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_direction", length = 10)
    private TargetDirection targetDirection;

    @Column(nullable = false)
    private Boolean enabled = true;
}
