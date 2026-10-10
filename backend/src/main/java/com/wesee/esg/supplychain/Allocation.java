/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * The GHG Protocol's physical-allocation method: the buyer's share of a supplier's footprint is
 * the share of the supplier's output it bought. Six decimals on the share, so a buyer taking one
 * unit in a million is not rounded to nothing.
 */
public final class Allocation {

    public static final int SHARE_SCALE = 6;
    public static final int TCO2E_SCALE = 4;

    private Allocation() {
    }

    public static BigDecimal share(BigDecimal purchasedQuantity, BigDecimal basisQuantity) {
        if (purchasedQuantity == null || basisQuantity == null) {
            throw new IllegalArgumentException("Both the purchased quantity and the basis are required");
        }
        if (purchasedQuantity.signum() < 0) {
            throw new IllegalArgumentException("A purchased quantity cannot be negative");
        }
        if (basisQuantity.signum() <= 0) {
            throw new IllegalArgumentException("The supplier's basis quantity must be greater than zero");
        }
        if (purchasedQuantity.compareTo(basisQuantity) > 0) {
            throw new IllegalArgumentException(
                    "You recorded buying " + purchasedQuantity.toPlainString() + " against a supplier"
                            + " that declared " + basisQuantity.toPlainString()
                            + " — one of those two figures is wrong, and allocating anyway would hand"
                            + " you more than the supplier's whole footprint");
        }
        return purchasedQuantity.divide(basisQuantity, SHARE_SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal allocate(BigDecimal scope1Tco2e, BigDecimal scope2Tco2e, BigDecimal share) {
        return scope1Tco2e.add(scope2Tco2e).multiply(share).setScale(TCO2E_SCALE, RoundingMode.HALF_UP);
    }
}
