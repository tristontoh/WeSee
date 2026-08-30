/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant.dto;

import jakarta.validation.constraints.NotNull;

/** Marks a tenant's trial as converted to paid — the manual escape hatch until real Stripe billing exists. */
public record UpdateTenantTrialRequest(@NotNull Boolean converted) {
}
