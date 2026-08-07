package com.wesee.esg.materiality.dto;

import jakarta.validation.constraints.NotNull;

public record ToggleStakeholderRequest(@NotNull Boolean selected) {
}
