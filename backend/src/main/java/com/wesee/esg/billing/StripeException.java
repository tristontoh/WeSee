/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.billing;

/** A call to Stripe's API failed (bad key, invalid params, network/timeout, etc). Message is sanitized — never includes the secret key. */
public class StripeException extends RuntimeException {
    public StripeException(String message) {
        super(message);
    }

    public StripeException(String message, Throwable cause) {
        super(message, cause);
    }
}
