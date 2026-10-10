/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.climate.EmissionActivityEntry;
import com.wesee.esg.climate.EmissionFactor;

import java.util.UUID;

/**
 * Turns a live activity entry into a frozen disclosure line. Every field is copied by value, with
 * no reference back to {@code emission_factor} — a disclosure signed under the 2024 factor must
 * keep reporting what was signed after MGTC publishes a 2025 edition.
 */
public final class SnapshotCopy {

    private SnapshotCopy() {
    }

    public static SharedDisclosureLine lineFrom(EmissionActivityEntry entry, UUID disclosureId) {
        EmissionFactor factor = entry.getEmissionFactor();
        SharedDisclosureLine line = new SharedDisclosureLine();
        line.setDisclosureId(disclosureId);
        line.setScope(factor.getScope().name());
        line.setEmissionFactorId(factor.getId());
        line.setEmissionFactorName(factor.getName());
        line.setQuantity(entry.getQuantity());
        line.setActivityUnit(factor.getActivityUnit());
        line.setFactorValue(factor.getFactorValue());
        line.setFactorSource(factor.getSource());
        line.setFactorSourceYear(factor.getSourceYear());
        line.setTco2e(entry.getCalculatedTco2e());
        return line;
    }
}
