/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.extraction;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Turns untrusted extractor output into proposals that are safe to store. Anything naming a
 * target outside the closed set, carrying an unusable value, or stated in a unit that cannot
 * reach the target's unit is dropped — one bad proposal never discards the rest of a document.
 */
public final class ProposalValidator {

    private ProposalValidator() {
    }

    public record ValidatedProposal(ProposedRecord source, String resolvedTargetId, BigDecimal convertedValue) {
    }

    public static List<ValidatedProposal> validate(List<ProposedRecord> proposals, ExtractionContext context) {
        List<ValidatedProposal> kept = new ArrayList<>();
        for (ProposedRecord proposal : proposals) {
            validateOne(proposal, context).ifPresent(kept::add);
        }
        return kept;
    }

    private static Optional<ValidatedProposal> validateOne(ProposedRecord proposal, ExtractionContext context) {
        if (proposal.value() == null || proposal.value().signum() < 0 || proposal.targetId() == null) {
            return Optional.empty();
        }
        if (proposal.month() != null && (proposal.month() < 1 || proposal.month() > 12)) {
            return Optional.empty();
        }

        String targetUnit = targetUnitFor(proposal, context);
        if (targetUnit == null) {
            return Optional.empty();
        }
        if (!UnitConverter.canConvert(proposal.unitAsRead(), targetUnit)) {
            return Optional.empty();
        }

        BigDecimal converted = UnitConverter.convert(proposal.value(), proposal.unitAsRead(), targetUnit);
        return Optional.of(new ValidatedProposal(proposal, proposal.targetId(), converted));
    }

    /** Null when the proposal names a target this tenant does not have. */
    private static String targetUnitFor(ProposedRecord proposal, ExtractionContext context) {
        if (proposal.targetType() == ExtractionTargetType.EMISSION_ACTIVITY) {
            return context.factors().stream()
                    .filter(f -> f.id().equals(proposal.targetId()))
                    .map(ExtractionContext.FactorOption::activityUnit)
                    .findFirst()
                    .orElse(null);
        }
        return context.indicators().stream()
                .filter(i -> i.id().equals(proposal.targetId()))
                .map(ExtractionContext.IndicatorOption::unit)
                .findFirst()
                .orElse(null);
    }
}
