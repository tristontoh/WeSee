/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root - visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * What the buyer's Scope 3 Category 1 should read once allocations exist.
 *
 * <p>This exists because the first implementation pushed the allocated figure into
 * {@code emission_activity_entry} and called it done. Nothing reads activity entries into a
 * reported Scope 3 figure — {@code EmissionsService.scopeSeries} is called for scope 1 and 2 only,
 * and Scope 3 comes entirely from {@code scope3_value}. So the toast said "122.17 tCO2e added to
 * your Scope 3" while the Emissions screen never moved. The loop the whole feature exists to close
 * did not close.
 */
class AllocationTotalTest {

    private static Scope3Allocation allocation(int fiscalYear, String tco2e, int ghgCategory) {
        Scope3Allocation a = new Scope3Allocation();
        a.setFiscalYear(fiscalYear);
        a.setAllocatedTco2e(new BigDecimal(tco2e));
        a.setGhgCategory(ghgCategory);
        return a;
    }

    @Test
    void oneSupplierIsItsOwnTotal() {
        assertEquals(new BigDecimal("122.1675"),
                Scope3AllocationService.categoryTotal(List.of(allocation(2025, "122.1675", 1)), 2025, 1));
    }

    @Test
    void severalSuppliersInTheSameYearAreSummed() {
        assertEquals(new BigDecimal("610.8403"),
                Scope3AllocationService.categoryTotal(
                        List.of(allocation(2025, "122.1675", 1), allocation(2025, "488.6728", 1)), 2025, 1));
    }

    @Test
    void anotherYearsAllocationsDoNotCount() {
        assertEquals(new BigDecimal("122.1675"),
                Scope3AllocationService.categoryTotal(
                        List.of(allocation(2025, "122.1675", 1), allocation(2024, "999.9999", 1)), 2025, 1));
    }

    @Test
    void anotherGhgCategoryDoesNotCount() {
        assertEquals(new BigDecimal("122.1675"),
                Scope3AllocationService.categoryTotal(
                        List.of(allocation(2025, "122.1675", 1), allocation(2025, "500.0000", 2)), 2025, 1));
    }

    /** Removing the last allocation must take the figure back to zero, not leave the old total. */
    @Test
    void noAllocationsLeftIsZeroRatherThanNothing() {
        assertEquals(new BigDecimal("0.0000"), Scope3AllocationService.categoryTotal(List.of(), 2025, 1));
    }

    @Test
    void theTotalCarriesFourDecimalsLikeEveryOtherTonnageInTheSchema() {
        assertEquals(4, Scope3AllocationService
                .categoryTotal(List.of(allocation(2025, "1.1", 1)), 2025, 1).scale());
    }
}
