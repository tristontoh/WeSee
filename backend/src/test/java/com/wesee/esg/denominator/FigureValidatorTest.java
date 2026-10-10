/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Year;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FigureValidatorTest {

    @Test
    void anOrdinaryFigureIsAccepted() {
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.REVENUE, new BigDecimal("48.0000"), 2025));
    }

    @Test
    void aNegativeFigureIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                FigureValidator.validate(AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("-5"), 2025));
        assertTrue(e.getMessage().contains("negative"), e.getMessage());
    }

    @Test
    void zeroIsAcceptedBecauseACompanyMayGenuinelyHaveNoneOfSomething() {
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.LOST_TIME_INJURIES, BigDecimal.ZERO, 2025));
    }

    @Test
    void aFiscalYearBeforeTheFloorIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                FigureValidator.validate(AnnualFigureKey.REVENUE, new BigDecimal("48"), 1999));
        assertTrue(e.getMessage().contains("2000"), e.getMessage());
    }

    @Test
    void aFiscalYearBeyondNextYearIsRefused() {
        int tooFar = Year.now().getValue() + 2;
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                FigureValidator.validate(AnnualFigureKey.REVENUE, new BigDecimal("48"), tooFar));
        assertTrue(e.getMessage().contains(String.valueOf(FigureValidator.latestFiscalYear())), e.getMessage());
    }

    @Test
    void nextYearIsAcceptedBecauseAFiscalYearCanLeadTheCalendarYear() {
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.REVENUE, new BigDecimal("48"), Year.now().getValue() + 1));
    }

    @Test
    void aCountFigureWithFractionalPeopleIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                FigureValidator.validate(AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("12.5"), 2025));
        assertTrue(e.getMessage().contains("whole"), e.getMessage());
    }

    @Test
    void aMeasuredFigureWithDecimalsIsAccepted() {
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.RECYCLED_WATER_VOLUME, new BigDecimal("1240.5500"), 2025));
    }

    /**
     * Review Focus 3. Across a year of churn a company can genuinely lose more people than its
     * average headcount, producing a turnover rate above 100%. The figure store must accept it;
     * deciding whether that ratio is reportable belongs to the derivation layer, which can show
     * the inputs. Refusing it here would make a real company unable to report its real year.
     */
    @Test
    void departuresExceedingHeadcountAreStoredBecauseChurnCanGenuinelyExceedAverageHeadcount() {
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.EMPLOYEE_DEPARTURES, new BigDecimal("60"), 2025));
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("50"), 2025));
    }

    @Test
    void theFloorYearIsTwoThousand() {
        assertEquals(2000, FigureValidator.EARLIEST_FISCAL_YEAR);
    }

    @Test
    void aNullValueIsRefused() {
        assertThrows(IllegalArgumentException.class, () ->
                FigureValidator.validate(AnnualFigureKey.REVENUE, null, 2025));
    }
}
