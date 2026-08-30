/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.reference;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "sustainability_matter")
@Getter
@Setter
@NoArgsConstructor
public class SustainabilityMatter {

    @Id
    @Column(length = 30)
    private String id;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SustainabilityMatterCategory category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "matter_set", nullable = false, length = 20)
    private MatterSet matterSet;

    public SustainabilityMatter(String id, String name, SustainabilityMatterCategory category, String description, MatterSet matterSet) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.description = description;
        this.matterSet = matterSet;
    }
}
