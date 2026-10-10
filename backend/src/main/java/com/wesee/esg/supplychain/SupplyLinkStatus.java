/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

public enum SupplyLinkStatus {
    /** Invited, not yet answered. No data crosses in this state. */
    PENDING,
    /** Both companies exist and agreed. The only state in which a disclosure can be read. */
    ACTIVE,
    DECLINED,
    /** Withdrawn by either side. Kept rather than deleted, so the history stays legible. */
    REVOKED
}
