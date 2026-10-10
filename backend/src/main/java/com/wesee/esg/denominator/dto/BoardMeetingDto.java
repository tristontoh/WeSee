/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator.dto;

import com.wesee.esg.denominator.BoardMeeting;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record BoardMeetingDto(
        UUID id,
        Integer fiscalYear,
        LocalDate heldOn,
        String kind,
        List<AttendanceDto> attendance
) {
    public record AttendanceDto(UUID boardMemberId, String memberName, boolean attended) {
    }

    public static BoardMeetingDto from(BoardMeeting m, List<AttendanceDto> attendance) {
        return new BoardMeetingDto(m.getId(), m.getFiscalYear(), m.getHeldOn(), m.getKind(), attendance);
    }
}
