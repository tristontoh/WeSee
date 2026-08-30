/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.extraction;

import com.wesee.esg.extraction.dto.AcceptRecordRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * The period a reading is filed under decides which report it appears in, so the reviewer's choice
 * has to survive the request. Choosing "Whole year" used to be indistinguishable from expressing no
 * opinion, and the accept path then quietly reinstated the month the model had guessed.
 */
class AcceptPeriodTest {

    /** Mirrors ExtractionReviewService.accept's resolution, which is what the UI depends on. */
    private static Integer resolveMonth(AcceptRecordRequest request, Integer recordMonth) {
        return Boolean.TRUE.equals(request.clearMonth())
                ? null
                : request.month() != null ? request.month() : recordMonth;
    }

    @Test
    void wholeYearClearsTheMonthTheModelProposed() {
        var request = new AcceptRecordRequest(BigDecimal.ONE, 2026, null, true);
        assertNull(resolveMonth(request, 2), "the reviewer said whole year; February was the model's guess");
    }

    @Test
    void anUnstatedMonthStillFallsBackToTheReading() {
        // A caller that expresses no opinion — the plain POST with no body — keeps the model's month.
        var request = new AcceptRecordRequest(null, null, null, null);
        assertEquals(2, resolveMonth(request, 2));
    }

    @Test
    void anExplicitMonthWins() {
        var request = new AcceptRecordRequest(null, 2026, 11, false);
        assertEquals(11, resolveMonth(request, 2));
    }

    @Test
    void clearMonthBeatsAMonthLeftInThePayload() {
        // The strip sends both; "whole year" is the decision, so it must not be overridden.
        var request = new AcceptRecordRequest(null, 2026, 2, true);
        assertNull(resolveMonth(request, 2));
    }
}
