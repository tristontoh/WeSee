/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "scope3_category", uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "name"}))
@Getter
@Setter
@NoArgsConstructor
public class Scope3Category extends TenantOwnedEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String tooltip;

    /** 1-15 when this row is one of the GHG Protocol's standard Scope 3 categories (seeded on
     *  first fetch, see EmissionsService); null for a tenant-added custom category. */
    @Column(name = "standard_category_number")
    private Integer standardCategoryNumber;
}
