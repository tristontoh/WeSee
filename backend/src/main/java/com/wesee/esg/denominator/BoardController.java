/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.denominator.dto.BoardMeetingDto;
import com.wesee.esg.denominator.dto.BoardMemberDto;
import com.wesee.esg.denominator.dto.SetAttendanceRequest;
import com.wesee.esg.denominator.dto.UpsertBoardMeetingRequest;
import com.wesee.esg.denominator.dto.UpsertBoardMemberRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/denominators/board")
@Validated
public class BoardController {

    private final BoardService boardService;

    public BoardController(BoardService boardService) {
        this.boardService = boardService;
    }

    @GetMapping("/members/{fiscalYear}")
    @PreAuthorize("@perm.check('indicators.view')")
    public List<BoardMemberDto> listMembers(@PathVariable int fiscalYear) {
        return boardService.listMembers(fiscalYear);
    }

    @PostMapping("/members/{fiscalYear}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public BoardMemberDto addMember(@PathVariable int fiscalYear,
                                    @Valid @RequestBody UpsertBoardMemberRequest request) {
        return boardService.upsertMember(null, fiscalYear, request);
    }

    @PutMapping("/members/{fiscalYear}/{memberId}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public BoardMemberDto updateMember(@PathVariable int fiscalYear,
                                       @PathVariable UUID memberId,
                                       @Valid @RequestBody UpsertBoardMemberRequest request) {
        return boardService.upsertMember(memberId, fiscalYear, request);
    }

    @DeleteMapping("/members/{memberId}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public void deleteMember(@PathVariable UUID memberId) {
        boardService.deleteMember(memberId);
    }

    @GetMapping("/meetings/{fiscalYear}")
    @PreAuthorize("@perm.check('indicators.view')")
    public List<BoardMeetingDto> listMeetings(@PathVariable int fiscalYear) {
        return boardService.listMeetings(fiscalYear);
    }

    @PostMapping("/meetings/{fiscalYear}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public BoardMeetingDto addMeeting(@PathVariable int fiscalYear,
                                      @Valid @RequestBody UpsertBoardMeetingRequest request) {
        return boardService.upsertMeeting(null, fiscalYear, request);
    }

    @PutMapping("/meetings/{fiscalYear}/{meetingId}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public BoardMeetingDto updateMeeting(@PathVariable int fiscalYear,
                                         @PathVariable UUID meetingId,
                                         @Valid @RequestBody UpsertBoardMeetingRequest request) {
        return boardService.upsertMeeting(meetingId, fiscalYear, request);
    }

    @DeleteMapping("/meetings/{meetingId}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public void deleteMeeting(@PathVariable UUID meetingId) {
        boardService.deleteMeeting(meetingId);
    }

    @PutMapping("/meetings/{meetingId}/attendance/{memberId}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public void setAttendance(@PathVariable UUID meetingId,
                              @PathVariable UUID memberId,
                              @Valid @RequestBody SetAttendanceRequest request) {
        boardService.setAttendance(meetingId, memberId, request);
    }
}
