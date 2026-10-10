/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.climate.EmissionActivityEntry;
import com.wesee.esg.climate.EmissionScope;
import com.wesee.esg.climate.EmissionFactor;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SnapshotCopyTest {

    private static EmissionActivityEntry entry() {
        EmissionFactor factor = new EmissionFactor();
        factor.setId("MY-GRID-2024");
        factor.setName("Malaysia grid electricity");
        factor.setScope(EmissionScope.SCOPE_2);
        factor.setActivityUnit("kWh");
        factor.setFactorValue(new BigDecimal("0.585000"));
        factor.setSource("MGTC LCOS");
        factor.setSourceYear(2024);

        EmissionActivityEntry e = new EmissionActivityEntry();
        e.setFiscalYear(2025);
        e.setEmissionFactor(factor);
        e.setQuantity(new BigDecimal("912446.0000"));
        e.setCalculatedTco2e(new BigDecimal("533.7809"));
        return e;
    }

    @Test
    void theLineCarriesTheFactorValueNotJustItsId() {
        SharedDisclosureLine line = SnapshotCopy.lineFrom(entry(), UUID.randomUUID());
        assertEquals(new BigDecimal("0.585000"), line.getFactorValue());
        assertEquals("MGTC LCOS", line.getFactorSource());
        assertEquals(2024, line.getFactorSourceYear());
    }

    @Test
    void theLineCarriesTheQuantityAndTheResult() {
        SharedDisclosureLine line = SnapshotCopy.lineFrom(entry(), UUID.randomUUID());
        assertEquals(new BigDecimal("912446.0000"), line.getQuantity());
        assertEquals(new BigDecimal("533.7809"), line.getTco2e());
        assertEquals("kWh", line.getActivityUnit());
    }

    @Test
    void theLineCarriesTheScopeAsText() {
        assertEquals("SCOPE_2", SnapshotCopy.lineFrom(entry(), UUID.randomUUID()).getScope());
    }

    /**
     * Review Focus 4. The whole point of copying rather than referencing: when MGTC publishes a
     * 2025 edition and the reference row is edited, a line signed under the 2024 factor must keep
     * reporting 0.585.
     */
    @Test
    void editingTheFactorAfterwardsDoesNotChangeThePublishedLine() {
        EmissionActivityEntry e = entry();
        SharedDisclosureLine line = SnapshotCopy.lineFrom(e, UUID.randomUUID());

        e.getEmissionFactor().setFactorValue(new BigDecimal("0.774000"));
        e.getEmissionFactor().setSourceYear(2025);
        e.getEmissionFactor().setSource("MGTC LCOS 2025");

        assertEquals(new BigDecimal("0.585000"), line.getFactorValue());
        assertEquals(2024, line.getFactorSourceYear());
        assertEquals("MGTC LCOS", line.getFactorSource());
    }

    @Test
    void theLineRecordsWhichDisclosureItBelongsTo() {
        UUID disclosureId = UUID.randomUUID();
        assertEquals(disclosureId, SnapshotCopy.lineFrom(entry(), disclosureId).getDisclosureId());
    }
}
