/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing.dto;

import java.time.LocalDate;

/** {@code nextBillingDate} is null when the company has never had an active Stripe subscription. */
public record NextBillingResponse(LocalDate nextBillingDate) {}
