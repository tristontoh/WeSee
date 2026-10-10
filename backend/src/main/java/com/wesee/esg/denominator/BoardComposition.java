/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import java.time.LocalDate;
import java.util.List;

/**
 * Counting a board. Pure functions over a roster, so the governance ratios can be unit-tested
 * without a database — and so "how many directors" has exactly one answer in the codebase.
 */
public final class BoardComposition {

    private static final String FEMALE = "FEMALE";

    private BoardComposition() {
    }

    public static int directorCount(List<BoardMember> roster) {
        return roster == null ? 0 : roster.size();
    }

    public static int femaleCount(List<BoardMember> roster) {
        if (roster == null) {
            return 0;
        }
        return (int) roster.stream()
                .filter(m -> m.getGender() != null && FEMALE.equalsIgnoreCase(m.getGender().trim()))
                .count();
    }

    public static int independentCount(List<BoardMember> roster) {
        if (roster == null) {
            return 0;
        }
        return (int) roster.stream().filter(m -> Boolean.TRUE.equals(m.getIndependent())).count();
    }

    /**
     * Whether this director sat on the given date. A null date is open-ended, not absent: a roster
     * entered without dates describes a director who served the whole year.
     */
    public static boolean servedOn(BoardMember member, LocalDate date) {
        if (member.getAppointedAt() != null && date.isBefore(member.getAppointedAt())) {
            return false;
        }
        return member.getResignedAt() == null || !date.isAfter(member.getResignedAt());
    }

    public static void validateTenure(LocalDate appointedAt, LocalDate resignedAt) {
        if (appointedAt != null && resignedAt != null && resignedAt.isBefore(appointedAt)) {
            throw new IllegalArgumentException(
                    "A director cannot resign on " + resignedAt + ", before being appointed on " + appointedAt);
        }
    }
}
