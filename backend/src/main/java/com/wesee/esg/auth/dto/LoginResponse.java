package com.wesee.esg.auth.dto;

public record LoginResponse(boolean mfaRequired, String mfaToken, boolean emailVerificationRequired, AuthResponse auth) {
}
