/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BoardCompositionTest {

    private static BoardMember member(String name, String gender, boolean independent,
                                      LocalDate appointed, LocalDate resigned) {
        BoardMember m = new BoardMember();
        m.setName(name);
        m.setGender(gender);
        m.setIndependent(independent);
        m.setAppointedAt(appointed);
        m.setResignedAt(resigned);
        return m;
    }

    @Test
    void countsEveryDirectorOnTheRoster() {
        List<BoardMember> roster = List.of(
                member("A", "FEMALE", true, null, null),
                member("B", "MALE", false, null, null),
                member("C", "MALE", true, null, null));
        assertEquals(3, BoardComposition.directorCount(roster));
    }

    @Test
    void countsFemaleDirectorsCaseInsensitively() {
        List<BoardMember> roster = List.of(
                member("A", "Female", true, null, null),
                member("B", "FEMALE", false, null, null),
                member("C", "male", true, null, null));
        assertEquals(2, BoardComposition.femaleCount(roster));
    }

    @Test
    void aDirectorWithNoGenderRecordedIsNotCountedAsFemale() {
        List<BoardMember> roster = List.of(
                member("A", null, true, null, null),
                member("B", "FEMALE", false, null, null));
        assertEquals(1, BoardComposition.femaleCount(roster));
    }

    @Test
    void countsIndependentDirectors() {
        List<BoardMember> roster = List.of(
                member("A", "FEMALE", true, null, null),
                member("B", "MALE", false, null, null));
        assertEquals(1, BoardComposition.independentCount(roster));
    }

    @Test
    void anEmptyRosterCountsZeroRatherThanThrowing() {
        assertEquals(0, BoardComposition.directorCount(List.of()));
        assertEquals(0, BoardComposition.femaleCount(List.of()));
    }

    @Test
    void aDirectorWithNoDatesServedOnAnyDate() {
        BoardMember m = member("A", "FEMALE", true, null, null);
        assertTrue(BoardComposition.servedOn(m, LocalDate.of(2025, 6, 1)));
    }

    @Test
    void aDirectorAppointedMidYearDidNotServeBeforeAppointment() {
        BoardMember m = member("A", "FEMALE", true, LocalDate.of(2025, 7, 1), null);
        assertFalse(BoardComposition.servedOn(m, LocalDate.of(2025, 6, 1)));
        assertTrue(BoardComposition.servedOn(m, LocalDate.of(2025, 7, 1)));
        assertTrue(BoardComposition.servedOn(m, LocalDate.of(2025, 8, 1)));
    }

    @Test
    void aResignedDirectorDidNotServeAfterResignation() {
        BoardMember m = member("A", "FEMALE", true, null, LocalDate.of(2025, 9, 30));
        assertTrue(BoardComposition.servedOn(m, LocalDate.of(2025, 9, 30)));
        assertFalse(BoardComposition.servedOn(m, LocalDate.of(2025, 10, 1)));
    }

    /** Review Focus 4. Negative tenure makes every attendance denominator meaningless. */
    @Test
    void resignationBeforeAppointmentIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                BoardComposition.validateTenure(LocalDate.of(2025, 7, 1), LocalDate.of(2025, 3, 1)));
        assertTrue(e.getMessage().toLowerCase().contains("resign"), e.getMessage());
    }

    @Test
    void resignationOnTheDayOfAppointmentIsAllowed() {
        assertDoesNotThrow(() ->
                BoardComposition.validateTenure(LocalDate.of(2025, 7, 1), LocalDate.of(2025, 7, 1)));
    }

    @Test
    void openEndedTenureIsAllowed() {
        assertDoesNotThrow(() -> BoardComposition.validateTenure(null, null));
        assertDoesNotThrow(() -> BoardComposition.validateTenure(LocalDate.of(2025, 1, 1), null));
        assertDoesNotThrow(() -> BoardComposition.validateTenure(null, LocalDate.of(2025, 1, 1)));
    }
}
