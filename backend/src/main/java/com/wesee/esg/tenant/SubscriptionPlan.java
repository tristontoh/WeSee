package com.wesee.esg.tenant;

public enum SubscriptionPlan {
    STARTER(1),
    GROWTH(2),
    ISSUER_READY(3);

    private final int level;

    SubscriptionPlan(int level) {
        this.level = level;
    }

    public int getLevel() {
        return level;
    }

    public boolean atLeast(SubscriptionPlan other) {
        return this.level >= other.level;
    }
}
