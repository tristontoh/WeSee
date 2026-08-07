package com.wesee.esg.reference;

import com.wesee.esg.tenant.MarketClassification;
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
 * SRS FR-6.3/6.4: climate-first transition relief is a regulatory rule (2 years Main Market,
 * 3 years ACE Market), not user-entered data — seeded here and used to compute Scope 3
 * transition-relief status server-side rather than storing it as a freely-editable flag.
 */
@Entity
@Table(name = "transition_relief_rule")
@Getter
@Setter
@NoArgsConstructor
public class TransitionReliefRule {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "market_classification", length = 30)
    private MarketClassification marketClassification;

    @Column(name = "relief_years", nullable = false)
    private Integer reliefYears;
}
