package com.wesee.model;

/** Supplier assurance level in the B2B exchange (mirrors the FastAPI model). */
public enum AssuranceTier {
    SYSTEM_VERIFIED("system_verified"),
    ENTERPRISE_INGESTED("enterprise_ingested"),
    UNVERIFIED("unverified");

    private final String value;

    AssuranceTier(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
