/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UnitConverterTest {

    @Test
    void kilowattHoursConvertToMegawattHours() {
        assertEquals(new BigDecimal("1.2400"), UnitConverter.convert(new BigDecimal("1240"), "kWh", "MWh"));
    }

    @Test
    void megawattHoursConvertBackToKilowattHours() {
        assertEquals(new BigDecimal("1240.0000"), UnitConverter.convert(new BigDecimal("1.24"), "MWh", "kWh"));
    }

    @Test
    void unitComparisonIgnoresCase() {
        assertEquals(new BigDecimal("1.2400"), UnitConverter.convert(new BigDecimal("1240"), "KWH", "mwh"));
    }

    @Test
    void identicalUnitsAreReturnedUnchangedToFourDecimals() {
        assertEquals(new BigDecimal("500.0000"), UnitConverter.convert(new BigDecimal("500"), "m3", "m3"));
    }

    @Test
    void litersConvertToCubicMetres() {
        assertEquals(new BigDecimal("1.5000"), UnitConverter.convert(new BigDecimal("1500"), "liters", "m3"));
    }

    @Test
    void unknownPairThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> UnitConverter.convert(new BigDecimal("1"), "kWh", "tonnes"));
    }

    @Test
    void canConvertReportsSupportedAndUnsupportedPairs() {
        assertTrue(UnitConverter.canConvert("kWh", "MWh"));
        assertFalse(UnitConverter.canConvert("kWh", "tonnes"));
    }
}
