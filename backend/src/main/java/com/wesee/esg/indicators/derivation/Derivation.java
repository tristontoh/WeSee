/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

/**
 * One named formula. A registry of these rather than an expression parsed at runtime: an evaluator
 * would be a new attack surface and a new class of silent wrong answers, for eleven formulas
 * that change about once a decade.
 */
public interface Derivation {

    /** The arithmetic, or an account of what is missing. Pure — no repository, no clock. */
    DerivationResult compute(DerivationInputs inputs);

    /** Shown on the indicator screen, e.g. "(Scope 1 + Scope 2) / revenue". */
    String formula();

    /**
     * The unit this formula produces, checked against each indicator definition's own unit by
     * DerivationCatalogueUnitsTest. A percentage formula pointed at a definition recorded in MYR
     * is the defect this exists to make impossible.
     */
    String outputUnit();
}
