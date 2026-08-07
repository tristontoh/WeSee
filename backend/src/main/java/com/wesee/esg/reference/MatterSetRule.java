package com.wesee.esg.reference;

import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.SubscriptionPlan;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Which {@link MatterSet} applies to a company, seeded as configurable data rather than
 * hard-coded logic (SRS NFR). {@code marketClassification} is null for matter sets that apply
 * regardless of market (e.g. the opt-in SECTOR set).
 */
@Entity
@Table(name = "matter_set_rule")
@Getter
@Setter
@NoArgsConstructor
public class MatterSetRule {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "matter_set", length = 20)
    private MatterSet matterSet;

    @Enumerated(EnumType.STRING)
    @Column(name = "min_plan", nullable = false, length = 30)
    private SubscriptionPlan minPlan;

    @Enumerated(EnumType.STRING)
    @Column(name = "market_classification", length = 30)
    private MarketClassification marketClassification;
}
