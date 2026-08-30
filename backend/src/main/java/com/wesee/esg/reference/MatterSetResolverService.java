/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.reference;

import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.SubscriptionPlan;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Resolves which {@link MatterSet}(s) apply to a company from its plan + market classification,
 * per FR-5.1 (SEDG's 35 disclosures for SME, 9 matters Main Market, 11 ACE Market) plus the
 * opt-in sector module (FR-5.4).
 */
@Service
public class MatterSetResolverService {

    private final SustainabilityMatterRepository matterRepository;

    public MatterSetResolverService(SustainabilityMatterRepository matterRepository) {
        this.matterRepository = matterRepository;
    }

    public List<MatterSet> resolveApplicableMatterSets(Company company) {
        List<MatterSet> sets = new ArrayList<>();

        if (company.getSubscriptionPlan() == SubscriptionPlan.ISSUER_READY
                && company.getMarketClassification() == MarketClassification.MAIN_MARKET) {
            sets.add(MatterSet.BURSA_MAIN);
        } else if (company.getSubscriptionPlan() == SubscriptionPlan.ISSUER_READY
                && company.getMarketClassification() == MarketClassification.ACE_MARKET) {
            sets.add(MatterSet.BURSA_ACE);
        } else {
            sets.add(MatterSet.SEDG);
        }

        if (Boolean.TRUE.equals(company.getSectorModuleEnabled()) && company.getSubscriptionPlan().atLeast(SubscriptionPlan.GROWTH)) {
            sets.add(MatterSet.SECTOR);
        }

        return sets;
    }

    public List<SustainabilityMatter> resolveApplicableMatters(Company company) {
        return resolveApplicableMatterSets(company).stream()
                .flatMap(set -> matterRepository.findByMatterSetOrderByCategoryAscNameAsc(set).stream())
                .toList();
    }
}
