package com.wesee.esg.billing.dto;

import java.time.LocalDate;

/** {@code nextBillingDate} is null when the company has never had an active Stripe subscription. */
public record NextBillingResponse(LocalDate nextBillingDate) {}
