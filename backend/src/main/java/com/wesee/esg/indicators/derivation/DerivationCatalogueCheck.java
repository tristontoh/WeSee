/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import java.util.List;
import java.util.Objects;

/**
 * Every {@code derivation_key} in the catalogue must name something in the registry. A migration
 * typo, or a key removed from the registry while a row still points at it, should stop the
 * application at boot with the bad key named — not return null to a user asking for an indicator.
 */
public final class DerivationCatalogueCheck {

    private DerivationCatalogueCheck() {
    }

    public static void verify(List<String> derivationKeysInUse) {
        List<String> unknown = derivationKeysInUse.stream()
                .filter(Objects::nonNull)
                .filter(k -> !DerivationRegistry.keys().contains(k))
                .distinct()
                .toList();
        if (!unknown.isEmpty()) {
            throw new IllegalStateException(
                    "Indicator definitions are marked DERIVED against formulas that do not exist: "
                            + String.join(", ", unknown)
                            + ". The registry knows: " + String.join(", ", DerivationRegistry.keys()));
        }
    }
}
