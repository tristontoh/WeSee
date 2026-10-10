/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.assurance;

import com.wesee.esg.common.exceptions.ConflictException;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * A signed year is closed to change.
 *
 * <p>Sign-off stores a SHA-256 over a fiscal year's values, and a published supply chain
 * disclosure carries the signer's name and that hash. If the figures behind a signed year can
 * still be edited, the signature is over numbers nobody can reproduce — a buyer reads "Signed by
 * Jane Lim" above a total Jane never saw.
 *
 * <p>This existed before, written out separately in three services, and they did not agree. Two
 * filtered on {@code status == SIGNED}; one did not, so a revoked sign-off kept its year locked
 * forever while telling the user to revoke the sign-off. Two more services that write year-scoped
 * figures — {@code EmissionsService} and {@code IndicatorService} — had no check at all. One
 * component, injected everywhere, is what stops those three states drifting apart again.
 */
@Component
public class SignOffLock {

    private final SignOffRecordRepository signOffRepository;

    public SignOffLock(SignOffRecordRepository signOffRepository) {
        this.signOffRepository = signOffRepository;
    }

    /**
     * The years this company has signed and not revoked.
     *
     * <p>Pure, so the filter that the three copies disagreed about can be tested directly.
     */
    public static Set<Integer> lockedYears(Collection<SignOffRecord> records) {
        return records.stream()
                .filter(r -> r.getStatus() == SignOffStatus.SIGNED)
                .map(SignOffRecord::getFiscalYear)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toUnmodifiableSet());
    }

    /** The years this company has signed and not revoked. */
    public Set<Integer> lockedYears(UUID companyId) {
        return lockedYears(signOffRepository.findByCompanyIdOrderByFiscalYearDesc(companyId));
    }

    /** @throws ConflictException if the year has been signed off and not revoked */
    public void requireYearOpen(UUID companyId, Integer fiscalYear, String whatWouldChange) {
        if (fiscalYear == null) {
            return; // A missing year is a validation problem for the caller to report, not a lock.
        }
        Set<Integer> locked = lockedYears(signOffRepository.findByCompanyIdOrderByFiscalYearDesc(companyId));
        if (locked.contains(fiscalYear)) {
            throw new ConflictException("FY" + fiscalYear + " has been signed off — " + whatWouldChange
                    + " would put its assurance hash over figures nobody signed."
                    + " Revoke the sign-off first.");
        }
    }
}
