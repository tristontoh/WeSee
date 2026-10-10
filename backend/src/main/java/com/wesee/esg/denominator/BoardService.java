/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.denominator.dto.BoardMeetingDto;
import com.wesee.esg.denominator.dto.BoardMemberDto;
import com.wesee.esg.denominator.dto.SetAttendanceRequest;
import com.wesee.esg.denominator.dto.UpsertBoardMeetingRequest;
import com.wesee.esg.denominator.dto.UpsertBoardMemberRequest;
import com.wesee.esg.indicators.derivation.DerivationService;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The board roster, the meetings it held, and who sat in them. The governance ratios read this
 * rather than a stored director count, because "how many directors were female" and "how many
 * meetings did this director's tenure cover" are questions a count cannot answer.
 */
@Service
public class BoardService {

    private final BoardMemberRepository memberRepository;
    private final BoardMeetingRepository meetingRepository;
    private final BoardMeetingAttendanceRepository attendanceRepository;
    private final CurrentUserProvider currentUserProvider;
    private final DerivationService derivationService;

    public BoardService(BoardMemberRepository memberRepository,
                        BoardMeetingRepository meetingRepository,
                        BoardMeetingAttendanceRepository attendanceRepository,
                        CurrentUserProvider currentUserProvider,
                        DerivationService derivationService) {
        this.memberRepository = memberRepository;
        this.meetingRepository = meetingRepository;
        this.attendanceRepository = attendanceRepository;
        this.currentUserProvider = currentUserProvider;
        this.derivationService = derivationService;
    }

    @Transactional(readOnly = true)
    public List<BoardMemberDto> listMembers(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        return memberRepository.findByCompanyIdAndFiscalYearOrderByNameAsc(companyId, fiscalYear)
                .stream().map(BoardMemberDto::from).toList();
    }

    @Transactional
    public BoardMemberDto upsertMember(UUID memberId, int fiscalYear, UpsertBoardMemberRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        FigureValidator.requireSaneFiscalYear(fiscalYear);
        BoardComposition.validateTenure(request.appointedAt(), request.resignedAt());

        BoardMember member = memberId == null
                ? new BoardMember()
                : memberRepository.findByIdAndCompanyId(memberId, companyId)
                        .orElseThrow(() -> new NotFoundException("No such director on this board"));
        member.setCompanyId(companyId);
        member.setFiscalYear(fiscalYear);
        member.setName(request.name());
        member.setRoleTitle(request.roleTitle());
        member.setIndependent(request.independent());
        member.setGender(request.gender());
        member.setAppointedAt(request.appointedAt());
        member.setResignedAt(request.resignedAt());
        BoardMemberDto saved = BoardMemberDto.from(memberRepository.save(member));
        // The board ratios count this roster, so a changed roster changes them now.
        derivationService.recomputeAllDependents(companyId, fiscalYear);
        return saved;
    }

    @Transactional
    public void deleteMember(UUID memberId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        BoardMember member = memberRepository.findByIdAndCompanyId(memberId, companyId)
                .orElseThrow(() -> new NotFoundException("No such director on this board"));
        // Attendance rows cascade in the schema, but delete them here too so the in-session
        // persistence context does not hand back rows the database has already dropped.
        attendanceRepository.deleteAll(
                attendanceRepository.findByCompanyIdAndBoardMemberId(companyId, memberId));
        Integer fiscalYear = member.getFiscalYear();
        memberRepository.delete(member);
        if (fiscalYear != null) {
            derivationService.recomputeAllDependents(companyId, fiscalYear);
        }
    }

    @Transactional(readOnly = true)
    public List<BoardMeetingDto> listMeetings(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        List<BoardMeeting> meetings =
                meetingRepository.findByCompanyIdAndFiscalYearOrderByHeldOnAsc(companyId, fiscalYear);
        if (meetings.isEmpty()) {
            return List.of();
        }
        Map<UUID, String> memberNames = new HashMap<>();
        memberRepository.findByCompanyIdAndFiscalYearOrderByNameAsc(companyId, fiscalYear)
                .forEach(m -> memberNames.put(m.getId(), m.getName()));

        // One query for every meeting's attendance, joined in memory. Not one query per meeting.
        List<BoardMeetingAttendance> rows = attendanceRepository.findByCompanyIdAndMeetingIdIn(
                companyId, meetings.stream().map(BoardMeeting::getId).toList());

        Map<UUID, List<BoardMeetingDto.AttendanceDto>> byMeeting = new HashMap<>();
        for (BoardMeetingAttendance row : rows) {
            byMeeting.computeIfAbsent(row.getMeetingId(), k -> new java.util.ArrayList<>())
                    .add(new BoardMeetingDto.AttendanceDto(
                            row.getBoardMemberId(),
                            memberNames.getOrDefault(row.getBoardMemberId(), "(former director)"),
                            Boolean.TRUE.equals(row.getAttended())));
        }
        return meetings.stream()
                .map(m -> BoardMeetingDto.from(m, byMeeting.getOrDefault(m.getId(), List.of())))
                .toList();
    }

    @Transactional
    public BoardMeetingDto upsertMeeting(UUID meetingId, int fiscalYear, UpsertBoardMeetingRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        FigureValidator.requireSaneFiscalYear(fiscalYear);

        BoardMeeting meeting = meetingId == null
                ? new BoardMeeting()
                : meetingRepository.findByIdAndCompanyId(meetingId, companyId)
                        .orElseThrow(() -> new NotFoundException("No such board meeting"));
        meeting.setCompanyId(companyId);
        meeting.setFiscalYear(fiscalYear);
        meeting.setHeldOn(request.heldOn());
        meeting.setKind(request.kind() == null || request.kind().isBlank() ? "BOARD" : request.kind());
        return BoardMeetingDto.from(meetingRepository.save(meeting), List.of());
    }

    @Transactional
    public void deleteMeeting(UUID meetingId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        BoardMeeting meeting = meetingRepository.findByIdAndCompanyId(meetingId, companyId)
                .orElseThrow(() -> new NotFoundException("No such board meeting"));
        attendanceRepository.deleteAll(
                attendanceRepository.findByCompanyIdAndMeetingIdIn(companyId, List.of(meetingId)));
        meetingRepository.delete(meeting);
    }

    @Transactional
    public void setAttendance(UUID meetingId, UUID memberId, SetAttendanceRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        BoardMeeting meeting = meetingRepository.findByIdAndCompanyId(meetingId, companyId)
                .orElseThrow(() -> new NotFoundException("No such board meeting"));
        BoardMember member = memberRepository.findByIdAndCompanyId(memberId, companyId)
                .orElseThrow(() -> new NotFoundException("No such director on this board"));

        // Recording that a director attended a meeting held outside their tenure is a data error,
        // and keeping it would skew every attendance denominator built on this roster.
        if (!BoardComposition.servedOn(member, meeting.getHeldOn())) {
            throw new ConflictException(member.getName() + " did not sit on the board on "
                    + meeting.getHeldOn() + " — check the appointment and resignation dates");
        }

        BoardMeetingAttendance attendance = attendanceRepository
                .findByCompanyIdAndMeetingIdAndBoardMemberId(companyId, meetingId, memberId)
                .orElseGet(() -> {
                    BoardMeetingAttendance a = new BoardMeetingAttendance();
                    a.setCompanyId(companyId);
                    a.setMeetingId(meetingId);
                    a.setBoardMemberId(memberId);
                    return a;
                });
        attendance.setAttended(request.attended());
        attendanceRepository.save(attendance);
    }
}
