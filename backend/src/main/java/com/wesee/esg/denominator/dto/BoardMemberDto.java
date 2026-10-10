/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator.dto;

import com.wesee.esg.denominator.BoardMember;

import java.time.LocalDate;
import java.util.UUID;

public record BoardMemberDto(
        UUID id,
        Integer fiscalYear,
        String name,
        String roleTitle,
        Boolean independent,
        String gender,
        LocalDate appointedAt,
        LocalDate resignedAt
) {
    public static BoardMemberDto from(BoardMember m) {
        return new BoardMemberDto(m.getId(), m.getFiscalYear(), m.getName(), m.getRoleTitle(),
                m.getIndependent(), m.getGender(), m.getAppointedAt(), m.getResignedAt());
    }
}
