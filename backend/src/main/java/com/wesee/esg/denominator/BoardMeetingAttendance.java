/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Plain UUID columns rather than {@code @ManyToOne}: nothing navigates from an attendance row back
 * to its meeting object, and a lazy proxy here would buy nothing.
 */
@Entity
@Table(name = "board_meeting_attendance")
@Getter
@Setter
@NoArgsConstructor
public class BoardMeetingAttendance extends TenantOwnedEntity {

    @Column(name = "meeting_id", nullable = false)
    private UUID meetingId;

    @Column(name = "board_member_id", nullable = false)
    private UUID boardMemberId;

    @Column(name = "attended", nullable = false)
    private Boolean attended;
}
