package com.wesee.model;

/** Tenant type. The lowercase value is what the frontend uses to route after login. */
public enum OrgType {
    SME("sme"),
    PLC("plc"),
    ADMIN("admin");

    private final String value;

    OrgType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
