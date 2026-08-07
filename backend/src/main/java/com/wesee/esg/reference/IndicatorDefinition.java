package com.wesee.esg.reference;

import com.wesee.esg.tenant.Sector;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "indicator_definition")
@Getter
@Setter
@NoArgsConstructor
public class IndicatorDefinition {

    @Id
    @Column(length = 30)
    private String id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 30)
    private String unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matter_id", nullable = false)
    private SustainabilityMatter matter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SustainabilityMatterCategory category;

    @Column(name = "is_sector_specific", nullable = false)
    private Boolean sectorSpecific = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sector_code")
    private Sector sector;

    @Column(name = "default_target", precision = 18, scale = 4)
    private BigDecimal defaultTarget;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_target_direction", length = 10)
    private TargetDirection defaultTargetDirection;

    @Enumerated(EnumType.STRING)
    @Column(name = "aggregation_rule", nullable = false, length = 20)
    private AggregationRule aggregationRule = AggregationRule.DIRECT_ANNUAL;
}
