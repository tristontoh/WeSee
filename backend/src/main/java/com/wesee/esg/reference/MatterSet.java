package com.wesee.esg.reference;

/**
 * Groups {@link SustainabilityMatter} rows by which disclosure framework they belong to:
 * SEDG (6 matters, SME Starter/Growth), BURSA_MAIN (9 matters, Main Market Issuer-Ready),
 * BURSA_ACE (11 matters, ACE Market Issuer-Ready), SECTOR (opt-in sector-specific add-on).
 */
public enum MatterSet {
    SEDG,
    BURSA_MAIN,
    BURSA_ACE,
    SECTOR
}
