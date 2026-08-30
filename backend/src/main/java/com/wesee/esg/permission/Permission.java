/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.permission;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A single grantable permission key (module + action) a {@link CustomRole} can include.
 * Seeded reference data — see V54__permission_catalog.sql — never created/edited via the API.
 */
@Entity
@Table(name = "permission")
@Getter
@Setter
@NoArgsConstructor
public class Permission {

    @Id
    @Column(name = "key", length = 80)
    private String key;

    @Column(nullable = false, length = 50)
    private String module;

    @Column(nullable = false, length = 30)
    private String action;

    @Column(nullable = false, length = 150)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;
}
