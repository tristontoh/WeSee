/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.governance;

/** Computed at read time from lastReviewedAt + reviewCycleMonths — never stored. */
public enum ComplianceStatus {
    NOT_ESTABLISHED,
    CURRENT,
    DUE_SOON,
    OVERDUE
}
