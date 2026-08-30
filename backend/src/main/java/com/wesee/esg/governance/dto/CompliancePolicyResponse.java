/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.governance.dto;

import com.wesee.esg.governance.CompliancePolicy;
import com.wesee.esg.governance.ComplianceStatus;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

public record CompliancePolicyResponse(
        UUID id,
        String policyKey,
        String name,
        String description,
        int reviewCycleMonths,
        Instant lastReviewedAt,
        Instant nextReviewDueAt,
        String documentUrl,
        ComplianceStatus status,
        /** True for the Bursa/MACC-mandated defaults — these can't be deleted. Company-added
         *  custom policies (policyKey == null) are always deletable. */
        boolean mandatory
) {
    private static final long DUE_SOON_WINDOW_DAYS = 60;
    private static final long DAYS_PER_MONTH = 30;

    public static CompliancePolicyResponse from(CompliancePolicy p) {
        Instant lastReviewed = p.getLastReviewedAt();
        Instant nextDue = lastReviewed != null
                ? lastReviewed.plus(p.getReviewCycleMonths() * DAYS_PER_MONTH, ChronoUnit.DAYS)
                : null;

        ComplianceStatus status;
        if (lastReviewed == null) {
            status = ComplianceStatus.NOT_ESTABLISHED;
        } else {
            Instant now = Instant.now();
            if (nextDue.isBefore(now)) {
                status = ComplianceStatus.OVERDUE;
            } else if (nextDue.isBefore(now.plus(DUE_SOON_WINDOW_DAYS, ChronoUnit.DAYS))) {
                status = ComplianceStatus.DUE_SOON;
            } else {
                status = ComplianceStatus.CURRENT;
            }
        }

        return new CompliancePolicyResponse(
                p.getId(), p.getPolicyKey(), p.getName(), p.getDescription(), p.getReviewCycleMonths(),
                lastReviewed, nextDue, p.getDocumentUrl(), status, p.getPolicyKey() != null
        );
    }
}
