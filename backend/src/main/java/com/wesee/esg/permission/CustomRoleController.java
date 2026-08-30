/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.permission;

import com.wesee.esg.permission.dto.CreateCustomRoleRequest;
import com.wesee.esg.permission.dto.CustomRoleResponse;
import com.wesee.esg.permission.dto.UpdateCustomRoleRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

/** Company-scoped custom role CRUD — see CustomRoleService for the tenant-isolation guarantees. */
@RestController
@RequestMapping("/api/v1/company/roles")
public class CustomRoleController {

    private final CustomRoleService customRoleService;

    public CustomRoleController(CustomRoleService customRoleService) {
        this.customRoleService = customRoleService;
    }

    @GetMapping
    @PreAuthorize("@perm.check('roles.view') or @perm.check('roles.manage')")
    public List<CustomRoleResponse> list() {
        return customRoleService.list();
    }

    @PostMapping
    @PreAuthorize("@perm.check('roles.manage')")
    public CustomRoleResponse create(@Valid @RequestBody CreateCustomRoleRequest request) {
        return customRoleService.create(request);
    }

    @PutMapping("/{roleId}")
    @PreAuthorize("@perm.check('roles.manage')")
    public CustomRoleResponse update(@PathVariable UUID roleId, @Valid @RequestBody UpdateCustomRoleRequest request) {
        return customRoleService.update(roleId, request);
    }

    @DeleteMapping("/{roleId}")
    @PreAuthorize("@perm.check('roles.manage')")
    public ResponseEntity<Void> delete(@PathVariable UUID roleId) {
        customRoleService.delete(roleId);
        return ResponseEntity.noContent().build();
    }
}
