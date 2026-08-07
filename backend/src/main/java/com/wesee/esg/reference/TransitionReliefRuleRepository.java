package com.wesee.esg.reference;

import org.springframework.data.jpa.repository.JpaRepository;
import com.wesee.esg.tenant.MarketClassification;

public interface TransitionReliefRuleRepository extends JpaRepository<TransitionReliefRule, MarketClassification> {
}
