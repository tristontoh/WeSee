/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.mfa.dto;

public record TotpEnrollResponse(String secret, String qrCodeDataUri, String otpauthUri) {
}
