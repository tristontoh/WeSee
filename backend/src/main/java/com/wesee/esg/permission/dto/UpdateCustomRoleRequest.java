package com.wesee.esg.permission.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record UpdateCustomRoleRequest(
        @NotBlank String name,
        String description,
        List<String> permissionKeys
) {
}
