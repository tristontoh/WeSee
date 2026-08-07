package com.wesee.esg.user.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateUserProfileRequest(
        @NotBlank String name,
        String phone,
        String jobTitle,
        String department,
        String bio
) {
}
