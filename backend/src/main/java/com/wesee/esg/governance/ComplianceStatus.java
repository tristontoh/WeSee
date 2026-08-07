package com.wesee.esg.governance;

/** Computed at read time from lastReviewedAt + reviewCycleMonths — never stored. */
public enum ComplianceStatus {
    NOT_ESTABLISHED,
    CURRENT,
    DUE_SOON,
    OVERDUE
}
