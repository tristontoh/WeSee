package com.wesee.esg.climate;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One singleton row per company covering IFRS S1's Governance, Risk Management, and Metrics &
 * Targets pillars across all material sustainability topics (not just climate — that's S2's
 * scope). The Strategy pillar is covered separately by {@link S1RiskOpportunity}, scoped per
 * business segment.
 */
@Entity
@Table(name = "ifrs_s1_disclosure", uniqueConstraints = @UniqueConstraint(columnNames = "company_id"))
@Getter
@Setter
@NoArgsConstructor
public class IfrsS1Disclosure extends TenantOwnedEntity {

    @Column(name = "oversight_description", columnDefinition = "TEXT")
    private String oversightDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_frequency", length = 20)
    private ReviewFrequency reviewFrequency;

    @Column(name = "responsible_committee", length = 200)
    private String responsibleCommittee;

    @Column(name = "identification_process", columnDefinition = "TEXT")
    private String identificationProcess;

    @Enumerated(EnumType.STRING)
    @Column(name = "integration_level", length = 30)
    private IntegrationLevel integrationLevel;

    @Column(name = "tracked_metrics", columnDefinition = "TEXT")
    private String trackedMetrics;

    @Column(name = "targets_summary", columnDefinition = "TEXT")
    private String targetsSummary;

    /** How these sustainability disclosures connect to the entity's financial statements — IFRS
     *  S1 requires "connected information," not an isolated sustainability appendix. */
    @Column(name = "connected_information", columnDefinition = "TEXT")
    private String connectedInformation;
}
