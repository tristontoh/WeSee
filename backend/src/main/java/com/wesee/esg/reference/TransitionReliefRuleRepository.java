/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.reference;

import org.springframework.data.jpa.repository.JpaRepository;
import com.wesee.esg.tenant.MarketClassification;

public interface TransitionReliefRuleRepository extends JpaRepository<TransitionReliefRule, MarketClassification> {
}
