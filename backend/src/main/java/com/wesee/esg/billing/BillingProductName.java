package com.wesee.esg.billing;

import com.wesee.esg.tenant.SubscriptionPlan;

/**
 * What a subscription is called on the customer's card statement, Stripe receipt and invoice line.
 *
 * One place because it is built in three (checkout session, product creation, invoice fallback) and
 * a customer comparing a receipt against a statement must see the same words in all of them.
 */
final class BillingProductName {

    private BillingProductName() {
    }

    static String of(SubscriptionPlan plan) {
        return plan + " Plan — WeSee";
    }
}
