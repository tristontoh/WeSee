package com.wesee.esg.tenant.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateTenantStatusRequest(@NotNull Boolean active) {
}
