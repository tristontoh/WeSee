/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.assurance.SignOffRecord;
import com.wesee.esg.assurance.SignOffStatus;
import com.wesee.esg.common.exceptions.ConflictException;

/**
 * A year may be published to a buyer only if it has something to attest with. The whole value of
 * this feature to the buyer is that the figure arrives already signed — publishing an unsigned
 * year would hand over a number with no more standing than an email.
 */
public final class PublishGuard {

    private PublishGuard() {
    }

    public static void requirePublishable(SignOffRecord record, int fiscalYear) {
        if (record == null) {
            throw new ConflictException("FY" + fiscalYear + " has not been signed off yet —"
                    + " an unsigned year has nothing to attest to a buyer");
        }
        if (record.getStatus() != SignOffStatus.SIGNED) {
            throw new ConflictException("The sign-off for FY" + fiscalYear
                    + " has been revoked — sign the year off again before publishing it");
        }
        if (record.getHash() == null || record.getHash().isBlank()) {
            throw new ConflictException("The sign-off for FY" + fiscalYear
                    + " carries no assurance hash, so there is nothing for a buyer to verify against");
        }
    }
}
