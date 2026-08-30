/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.mfa.dto;

import java.time.Instant;

public record TotpStatusResponse(boolean enabled, Instant enabledAt) {
}
