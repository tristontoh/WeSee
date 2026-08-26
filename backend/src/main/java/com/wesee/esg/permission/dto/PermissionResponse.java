package com.wesee.esg.permission.dto;

import com.wesee.esg.permission.Permission;

public record PermissionResponse(
        String key,
        String module,
        String action,
        String label,
        String description
) {
    public static PermissionResponse from(Permission p) {
        return new PermissionResponse(p.getKey(), p.getModule(), p.getAction(), p.getLabel(), p.getDescription());
    }
}
