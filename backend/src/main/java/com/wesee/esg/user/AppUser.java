/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.user;

import com.wesee.esg.common.BaseEntity;
import com.wesee.esg.permission.CustomRole;
import com.wesee.esg.tenant.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Not a {@link com.wesee.esg.common.TenantOwnedEntity} — login must look up a user by email
 * before any company context (and therefore the companyFilter) exists.
 */
@Entity
@Table(name = "app_user")
@Getter
@Setter
@NoArgsConstructor
public class AppUser extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    /**
     * Required for every non-{@code COMPANY_ADMIN} tenant user (enforced in CompanyService, not
     * a DB constraint) — the sole source of what a member can do, since custom roles fully
     * replace any implicit COMPANY_CONTRIBUTOR/CONSULTANT permission set. COMPANY_ADMIN never
     * has one: it implicitly passes every permission check (see PermissionGateService).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "custom_role_id")
    private CustomRole customRole;

    @Column(name = "token_version", nullable = false)
    private Integer tokenVersion = 0;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(length = 50)
    private String phone;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "avatar_path", length = 500)
    private String avatarPath;

    @Column(name = "avatar_original_name", length = 255)
    private String avatarOriginalName;

    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = true;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;
}
