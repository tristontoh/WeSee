/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.auth.dto;

public record LoginResponse(boolean mfaRequired, String mfaToken, boolean emailVerificationRequired, AuthResponse auth) {
}
