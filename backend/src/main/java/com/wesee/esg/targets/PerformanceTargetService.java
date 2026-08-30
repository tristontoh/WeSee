/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.targets;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.indicators.IndicatorValue;
import com.wesee.esg.indicators.IndicatorValueRepository;
import com.wesee.esg.reference.IndicatorDefinition;
import com.wesee.esg.reference.IndicatorDefinitionRepository;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.targets.dto.PerformanceTargetResponse;
import com.wesee.esg.targets.dto.UpsertPerformanceTargetRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class PerformanceTargetService {

    private final PerformanceTargetRepository repository;
    private final IndicatorDefinitionRepository indicatorDefinitionRepository;
    private final IndicatorValueRepository indicatorValueRepository;
    private final CurrentUserProvider currentUserProvider;

    public PerformanceTargetService(PerformanceTargetRepository repository,
                                     IndicatorDefinitionRepository indicatorDefinitionRepository,
                                     IndicatorValueRepository indicatorValueRepository,
                                     CurrentUserProvider currentUserProvider) {
        this.repository = repository;
        this.indicatorDefinitionRepository = indicatorDefinitionRepository;
        this.indicatorValueRepository = indicatorValueRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public List<PerformanceTargetResponse> list() {
        return repository.findByCompanyIdOrderByCreatedAtAscIdAsc(currentUserProvider.requireCompanyId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PerformanceTargetResponse get(UUID id) {
        return toResponse(requireOwned(id));
    }

    @Transactional
    public PerformanceTargetResponse create(UpsertPerformanceTargetRequest request) {
        PerformanceTarget target = new PerformanceTarget();
        target.setCompanyId(currentUserProvider.requireCompanyId());
        apply(target, request);
        return toResponse(repository.save(target));
    }

    @Transactional
    public PerformanceTargetResponse update(UUID id, UpsertPerformanceTargetRequest request) {
        PerformanceTarget target = requireOwned(id);
        apply(target, request);
        return toResponse(repository.save(target));
    }

    @Transactional
    public void delete(UUID id) {
        PerformanceTarget target = requireOwned(id);
        repository.delete(target);
    }

    private void apply(PerformanceTarget target, UpsertPerformanceTargetRequest request) {
        target.setTitle(request.title());
        target.setDescription(request.description());
        target.setBaselineYear(request.baselineYear());
        target.setTargetYear(request.targetYear());
        target.setTargetValue(request.targetValue());

        if (request.indicatorId() != null && !request.indicatorId().isBlank()) {
            IndicatorDefinition def = indicatorDefinitionRepository.findById(request.indicatorId())
                    .orElseThrow(() -> new NotFoundException("Unknown indicator id: " + request.indicatorId()));
            target.setIndicatorDefinition(def);
            // currentProgress becomes computed live from real indicator data once linked (see computeProgress) —
            // a manually-submitted value is ignored rather than treated as authoritative.
        } else {
            target.setIndicatorDefinition(null);
            target.setCurrentProgress(request.currentProgress() != null ? request.currentProgress() : 0);
        }

        target.setHorizon(request.horizon() != null ? TargetHorizon.valueOf(request.horizon()) : TargetHorizon.NEAR_TERM);
    }

    private PerformanceTarget requireOwned(UUID id) {
        return repository.findByIdAndCompanyId(id, currentUserProvider.requireCompanyId())
                .orElseThrow(() -> new NotFoundException("Target not found"));
    }

    private PerformanceTargetResponse toResponse(PerformanceTarget t) {
        Integer computed = t.getIndicatorDefinition() != null ? computeProgress(t) : null;
        return new PerformanceTargetResponse(
                t.getId(), t.getTitle(), t.getDescription(), t.getBaselineYear(), t.getTargetYear(),
                t.getTargetValue(), computed != null ? computed : t.getCurrentProgress(),
                t.getIndicatorDefinition() != null ? t.getIndicatorDefinition().getId() : null,
                computed != null,
                t.getHorizon().name()
        );
    }

    /**
     * Computes progress from real recorded indicator values rather than trusting a manually-typed
     * number: baseline actual = the value recorded for {@code baselineYear}; current actual = the
     * most recent recorded value at or before {@code targetYear}. Direction (reduction vs. growth)
     * is inferred by comparing the target value to the baseline actual, since PerformanceTarget has
     * no explicit direction field (unlike TenantIndicator's targetDirection). Returns null when
     * there isn't yet enough real data to compute (baseline or current actual missing), in which
     * case the caller falls back to the stored/manual value.
     */
    private Integer computeProgress(PerformanceTarget target) {
        UUID companyId = target.getCompanyId();
        String defId = target.getIndicatorDefinition().getId();

        BigDecimal baseline = indicatorValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(companyId, defId, target.getBaselineYear())
                .map(IndicatorValue::getValue)
                .orElse(null);
        BigDecimal current = latestValueAtOrBefore(companyId, defId, target.getTargetYear());
        if (baseline == null || current == null) {
            return null;
        }

        BigDecimal targetValue = target.getTargetValue();
        boolean reduction = targetValue.compareTo(baseline) < 0;
        BigDecimal numerator = reduction ? baseline.subtract(current) : current.subtract(baseline);
        BigDecimal denominator = reduction ? baseline.subtract(targetValue) : targetValue.subtract(baseline);
        if (denominator.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }

        int pct = numerator.multiply(BigDecimal.valueOf(100)).divide(denominator, 0, RoundingMode.HALF_UP).intValue();
        return Math.max(0, Math.min(100, pct));
    }

    private BigDecimal latestValueAtOrBefore(UUID companyId, String indicatorDefinitionId, int year) {
        return indicatorValueRepository.findByCompanyIdAndIndicatorDefinitionIdOrderByFiscalYearAsc(companyId, indicatorDefinitionId).stream()
                .filter(v -> v.getFiscalYear() <= year && v.getValue() != null)
                .max(Comparator.comparingInt(IndicatorValue::getFiscalYear))
                .map(IndicatorValue::getValue)
                .orElse(null);
    }
}
