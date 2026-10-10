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

import java.time.LocalDate;

/**
 * One director, for one fiscal year. Tenure dates live here rather than a stored meeting count, so
 * attendance can be measured against meetings held while this director actually sat.
 */
@Entity
@Table(name = "board_member")
@Getter
@Setter
@NoArgsConstructor
public class BoardMember extends TenantOwnedEntity {

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "role_title", length = 150)
    private String roleTitle;

    @Column(name = "independent", nullable = false)
    private Boolean independent = false;

    /** Nullable: "not stated" is an honest answer, and a NOT NULL default would invent one. */
    @Column(name = "gender", length = 20)
    private String gender;

    @Column(name = "appointed_at")
    private LocalDate appointedAt;

    @Column(name = "resigned_at")
    private LocalDate resignedAt;
}
