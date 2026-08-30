/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.materiality.dto;

import jakarta.validation.constraints.NotNull;

public record ToggleStakeholderRequest(@NotNull Boolean selected) {
}
