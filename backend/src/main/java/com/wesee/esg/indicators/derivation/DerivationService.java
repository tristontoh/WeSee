/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.assurance.SignOffRecordRepository;
import com.wesee.esg.assurance.SignOffStatus;
import com.wesee.esg.denominator.AnnualFigureKey;
import com.wesee.esg.denominator.BoardMember;
import com.wesee.esg.denominator.BoardMemberRepository;
import com.wesee.esg.denominator.CompanyAnnualFigure;
import com.wesee.esg.denominator.CompanyAnnualFigureRepository;
import com.wesee.esg.indicators.DerivationState;
import com.wesee.esg.indicators.IndicatorAuditEntry;
import com.wesee.esg.indicators.IndicatorAuditEntryRepository;
import com.wesee.esg.indicators.IndicatorValue;
import com.wesee.esg.indicators.IndicatorValueRepository;
import com.wesee.esg.indicators.IndicatorValueStatus;
import com.wesee.esg.reference.AggregationRule;
import com.wesee.esg.reference.IndicatorDefinition;
import com.wesee.esg.reference.IndicatorDefinitionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Computes the derived indicators from the inputs the platform holds, and keeps them in step when
 * those inputs change.
 */
@Service
public class DerivationService {

    private static final Logger log = LoggerFactory.getLogger(DerivationService.class);

    private final IndicatorDefinitionRepository definitionRepository;
    private final IndicatorValueRepository valueRepository;
    private final IndicatorAuditEntryRepository auditEntryRepository;
    private final CompanyAnnualFigureRepository figureRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final SignOffRecordRepository signOffRepository;

    public DerivationService(IndicatorDefinitionRepository definitionRepository,
                             IndicatorValueRepository valueRepository,
                             IndicatorAuditEntryRepository auditEntryRepository,
                             CompanyAnnualFigureRepository figureRepository,
                             BoardMemberRepository boardMemberRepository,
                             SignOffRecordRepository signOffRepository) {
        this.definitionRepository = definitionRepository;
        this.valueRepository = valueRepository;
        this.auditEntryRepository = auditEntryRepository;
        this.figureRepository = figureRepository;
        this.boardMemberRepository = boardMemberRepository;
        this.signOffRepository = signOffRepository;
    }

    // ---- pure decisions, unit-tested without a database -------------------------------------

    /** Scale-insensitive, so 25.0 and 25.00 are the same number and not a spurious revision. */
    static boolean isChange(BigDecimal stored, BigDecimal computed) {
        if (stored == null && computed == null) {
            return false;
        }
        if (stored == null || computed == null) {
            return true;
        }
        return stored.compareTo(computed) != 0;
    }

    /**
     * Always DRAFT. A derived figure may be computed from inputs nobody has approved, so it cannot
     * arrive pre-approved — and a recomputation invalidates a prior approval for the same reason a
     * monthly correction does.
     */
    static IndicatorValueStatus statusAfterRecompute() {
        return IndicatorValueStatus.DRAFT;
    }

    /** A missing input blanks a computed value, but never a figure typed in before derivation. */
    static boolean clearsStoredValue(DerivationState state) {
        return state == DerivationState.AWAITING_INPUTS;
    }

    /**
     * A number typed in before this indicator became derived survives until a real computation can
     * replace it. Somebody may have signed a year off against it, and blanking it would rewrite
     * their history without saying so.
     */
    static boolean leavesSupersededValueAlone(DerivationState stored, DerivationState computed) {
        return stored == DerivationState.SUPERSEDED_MANUAL && computed == DerivationState.AWAITING_INPUTS;
    }

    /**
     * A signed fiscal year is locked, exactly as
     * {@link com.wesee.esg.extraction.SignOffGuard#isYearLocked} already treats it for extraction.
     * Letting a changed denominator rewrite an attested figure would break the SHA-256 the signer
     * put their name to.
     */
    static boolean isLocked(Set<Integer> signedYears, int fiscalYear) {
        return signedYears.contains(fiscalYear);
    }

    // ---- the work ----------------------------------------------------------------------------

    /** Recomputes every derived indicator for one company and year. Returns how many changed. */
    @Transactional
    public int recomputeAllDependents(UUID companyId, int fiscalYear) {
        List<IndicatorDefinition> derived =
                definitionRepository.findByAggregationRule(AggregationRule.DERIVED);
        if (derived.isEmpty()) {
            return 0;
        }
        if (isLocked(signedYears(companyId), fiscalYear)) {
            // Not an error: the year is attested and closed. Entering a figure against a signed
            // year is allowed, it simply does not move what was signed.
            log.debug("FY{} is signed off for company {} — derived indicators left as attested",
                    fiscalYear, companyId);
            return 0;
        }

        DerivationInputs inputs = assemble(companyId, fiscalYear);
        int changed = 0;
        for (IndicatorDefinition def : derived) {
            if (applyOne(companyId, def, fiscalYear, inputs)) {
                changed++;
            }
        }
        return changed;
    }

    private Set<Integer> signedYears(UUID companyId) {
        return signOffRepository.findByCompanyIdOrderByFiscalYearDesc(companyId).stream()
                .filter(r -> r.getStatus() == SignOffStatus.SIGNED)
                .map(r -> r.getFiscalYear())
                .collect(Collectors.toSet());
    }

    private DerivationInputs assemble(UUID companyId, int fiscalYear) {
        Map<String, BigDecimal> indicatorValues = new HashMap<>();
        Map<String, String> indicatorUnits = new HashMap<>();
        for (IndicatorDefinition def : definitionRepository.findAllByOrderByCategoryAscNameAsc()) {
            indicatorUnits.put(def.getId(), def.getUnit());
        }
        valueRepository.findByCompanyIdAndIndicatorDefinitionIdInOrderByFiscalYearAsc(
                        companyId, List.copyOf(indicatorUnits.keySet())).stream()
                .filter(v -> v.getFiscalYear() != null && v.getFiscalYear() == fiscalYear)
                .filter(v -> v.getValue() != null)
                // A superseded manual number is not an input to anything: it is the output this
                // work is replacing, and feeding it back in would launder a typed figure as data.
                .filter(v -> v.getDerivationState() != DerivationState.SUPERSEDED_MANUAL)
                .forEach(v -> indicatorValues.put(v.getIndicatorDefinition().getId(), v.getValue()));

        Map<AnnualFigureKey, BigDecimal> figures = new EnumMap<>(AnnualFigureKey.class);
        for (CompanyAnnualFigure f : figureRepository.findByCompanyIdAndFiscalYear(companyId, fiscalYear)) {
            figures.put(f.getFigureKey(), f.getValue());
        }

        List<BoardMember> board =
                boardMemberRepository.findByCompanyIdAndFiscalYearOrderByNameAsc(companyId, fiscalYear);

        return new DerivationInputs(indicatorValues, indicatorUnits, figures, board);
    }

    /** @return true when the stored value moved. */
    private boolean applyOne(UUID companyId, IndicatorDefinition def, int fiscalYear,
                             DerivationInputs inputs) {
        DerivationResult result;
        try {
            result = DerivationRegistry.get(def.getDerivationKey()).compute(inputs);
        } catch (IllegalArgumentException e) {
            // A refused ratio is a data problem the user must see on the indicator, not a 500.
            // The refusal names the two numbers that disagree; carry it through as the reason.
            result = DerivationResult.awaiting(List.of(e.getMessage()));
        }

        IndicatorValue stored = valueRepository
                .findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(companyId, def.getId(), fiscalYear)
                .orElse(null);

        if (stored != null && leavesSupersededValueAlone(stored.getDerivationState(), result.state())) {
            return false;
        }
        if (stored == null && result.state() == DerivationState.AWAITING_INPUTS) {
            // Nothing to compute and nothing stored. Writing an empty row would only add noise.
            return false;
        }

        BigDecimal next = clearsStoredValue(result.state()) ? null : result.value();
        BigDecimal previous = stored == null ? null : stored.getValue();
        boolean changed = isChange(previous, next);

        IndicatorValue value = stored;
        if (value == null) {
            value = new IndicatorValue();
            value.setCompanyId(companyId);
            value.setIndicatorDefinition(def);
            value.setFiscalYear(fiscalYear);
        }
        value.setValue(next);
        value.setComputed(true);
        value.setDerivationState(result.state());
        value.setDerivationNote(result.state() == DerivationState.COMPUTED
                ? result.explanation()
                : "Waiting on: " + String.join("; ", result.missing()));
        if (changed) {
            value.setStatus(statusAfterRecompute());
            value.setApprovedByName(null);
            value.setApprovedAt(null);
        }
        valueRepository.save(value);

        if (changed && result.state() == DerivationState.COMPUTED) {
            // The audit trail's provenance slot carries the arithmetic instead of a document
            // quote: for a derived figure, the computation IS where the number came from.
            IndicatorAuditEntry entry = new IndicatorAuditEntry();
            entry.setCompanyId(companyId);
            entry.setIndicatorDefinition(def);
            entry.setFiscalYear(fiscalYear);
            entry.setValue(next);
            entry.setEnteredBy("Derived");
            entry.setSourceQuote(result.explanation());
            entry.setComment(def.getDerivationKey());
            auditEntryRepository.save(entry);
        }
        return changed;
    }
}
