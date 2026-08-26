package com.wesee.esg.permission;

import com.wesee.esg.common.StringListConverter;
import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * A company-defined role granting a set of {@link Permission} keys to its assigned users. Scoped
 * to a single company via {@link TenantOwnedEntity} (companyFilter Hibernate filter + explicit
 * requireOwned-style checks in CustomRoleService) — one company's roles are never visible to, or
 * assignable within, another.
 */
@Entity
@Table(name = "custom_role")
@Getter
@Setter
@NoArgsConstructor
public class CustomRole extends TenantOwnedEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Convert(converter = StringListConverter.class)
    @Column(name = "permission_keys", length = 2000)
    private List<String> permissionKeys = List.of();
}
