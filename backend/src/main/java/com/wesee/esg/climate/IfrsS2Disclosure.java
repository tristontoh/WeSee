package com.wesee.esg.climate;

import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.targets.PerformanceTarget;
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
 * One singleton row per company covering the ISSB 4 pillars: governance, strategy,
 * risk management, metrics & targets. No per-section audit requirement, so kept flat
 * rather than split into child tables.
 */
@Entity
@Table(name = "ifrs_s2_disclosure", uniqueConstraints = @UniqueConstraint(columnNames = "company_id"))
@Getter
@Setter
@NoArgsConstructor
public class IfrsS2Disclosure extends TenantOwnedEntity {

    @Column(name = "oversight_description", columnDefinition = "TEXT")
    private String oversightDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_frequency", length = 20)
    private ReviewFrequency reviewFrequency;

    @Column(name = "responsible_committee", length = 200)
    private String responsibleCommittee;

    @Column(name = "physical_risks", columnDefinition = "TEXT")
    private String physicalRisks;

    @Column(name = "transition_plan", columnDefinition = "TEXT")
    private String transitionPlan;

    @Column(name = "climate_resilience", columnDefinition = "TEXT")
    private String climateResilience;

    @Column(name = "identification_process", columnDefinition = "TEXT")
    private String identificationProcess;

    @Enumerated(EnumType.STRING)
    @Column(name = "integration_level", length = 30)
    private IntegrationLevel integrationLevel;

    @Column(name = "tracked_metrics", columnDefinition = "TEXT")
    private String trackedMetrics;

    @Column(name = "reduction_targets", columnDefinition = "TEXT")
    private String reductionTargets;

    @Column(name = "carbon_pricing", columnDefinition = "TEXT")
    private String carbonPricing;

    // --- Cross-industry metrics beyond GHG emissions and carbon pricing narrative ---

    @Column(name = "transition_risk_asset_pct", precision = 5, scale = 2)
    private BigDecimal transitionRiskAssetPct;

    @Column(name = "physical_risk_asset_pct", precision = 5, scale = 2)
    private BigDecimal physicalRiskAssetPct;

    @Column(name = "climate_opportunity_asset_pct", precision = 5, scale = 2)
    private BigDecimal climateOpportunityAssetPct;

    @Column(name = "climate_capex", precision = 18, scale = 2)
    private BigDecimal climateCapex;

    @Enumerated(EnumType.STRING)
    @Column(name = "climate_capex_currency", length = 10)
    private Currency climateCapexCurrency;

    @Column(name = "executive_remuneration_linked")
    private Boolean executiveRemunerationLinked;

    @Column(name = "executive_remuneration_description", columnDefinition = "TEXT")
    private String executiveRemunerationDescription;

    @Column(name = "carbon_price_value", precision = 10, scale = 2)
    private BigDecimal carbonPriceValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "carbon_price_currency", length = 10)
    private Currency carbonPriceCurrency;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_target_id")
    private PerformanceTarget linkedTarget;
}
