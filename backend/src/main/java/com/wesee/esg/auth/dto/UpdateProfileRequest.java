package com.wesee.esg.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record UpdateProfileRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        String phone,
        LocalDate dateOfBirth,
        String address,
        String bio
) {
}
