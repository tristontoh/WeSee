/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BoardMeetingAttendanceRepository extends JpaRepository<BoardMeetingAttendance, UUID> {

    /** One query for every meeting's attendance, not one query per meeting. */
    List<BoardMeetingAttendance> findByCompanyIdAndMeetingIdIn(UUID companyId, List<UUID> meetingIds);

    Optional<BoardMeetingAttendance> findByCompanyIdAndMeetingIdAndBoardMemberId(
            UUID companyId, UUID meetingId, UUID boardMemberId);

    List<BoardMeetingAttendance> findByCompanyIdAndBoardMemberId(UUID companyId, UUID boardMemberId);
}
