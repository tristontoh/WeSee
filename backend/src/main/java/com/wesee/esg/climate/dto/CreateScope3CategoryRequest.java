package com.wesee.esg.climate.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateScope3CategoryRequest(
        @NotBlank String name,
        String tooltip
) {
}
