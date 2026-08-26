package com.wesee.esg.tenant;

/**
 * The company's actual stock exchange board — a company-profile detail entered at creation time.
 * Deliberately separate from {@link MarketClassification}, which drives plan-tier gating and must
 * stay restricted to the three values the onboarding flow and PlanContext understand.
 */
public enum ListingBoard {
    MAIN_MARKET,
    ACE_MARKET,
    LEAP_MARKET,
    PRIVATE,
    OTHER
}
