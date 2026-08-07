package com.wesee.esg.indicators;

import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.indicators.dto.AuditEntryDto;
import com.wesee.esg.indicators.dto.IndicatorMonthlyValueDto;
import com.wesee.esg.indicators.dto.IndicatorResponse;
import com.wesee.esg.indicators.dto.IndicatorValuePointDto;
import com.wesee.esg.indicators.dto.SetIndicatorTargetRequest;
import com.wesee.esg.indicators.dto.SetIndicatorValueRequest;
import com.wesee.esg.reference.AggregationRule;
import com.wesee.esg.reference.IndicatorDefinition;
import com.wesee.esg.reference.IndicatorDefinitionRepository;
import com.wesee.esg.reference.MatterSetResolverService;
import com.wesee.esg.reference.SustainabilityMatter;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class IndicatorService {

    private final IndicatorDefinitionRepository indicatorDefinitionRepository;
    private final TenantIndicatorRepository tenantIndicatorRepository;
    private final IndicatorValueRepository indicatorValueRepository;
    private final IndicatorMonthlyValueRepository indicatorMonthlyValueRepository;
    private final IndicatorAuditEntryRepository auditEntryRepository;
    private final MatterSetResolverService matterSetResolverService;
    private final CurrentUserProvider currentUserProvider;
    private final CompanyRepository companyRepository;
    private final AppUserRepository appUserRepository;

    public IndicatorService(IndicatorDefinitionRepository indicatorDefinitionRepository,
                             TenantIndicatorRepository tenantIndicatorRepository,
                             IndicatorValueRepository indicatorValueRepository,
                             IndicatorMonthlyValueRepository indicatorMonthlyValueRepository,
                             IndicatorAuditEntryRepository auditEntryRepository,
                             MatterSetResolverService matterSetResolverService,
                             CurrentUserProvider currentUserProvider,
                             CompanyRepository companyRepository,
                             AppUserRepository appUserRepository) {
        this.indicatorDefinitionRepository = indicatorDefinitionRepository;
        this.tenantIndicatorRepository = tenantIndicatorRepository;
        this.indicatorValueRepository = indicatorValueRepository;
        this.indicatorMonthlyValueRepository = indicatorMonthlyValueRepository;
        this.auditEntryRepository = auditEntryRepository;
        this.matterSetResolverService = matterSetResolverService;
        this.currentUserProvider = currentUserProvider;
        this.companyRepository = companyRepository;
        this.appUserRepository = appUserRepository;
    }

    @Transactional(readOnly = true)
    public List<IndicatorResponse> listIndicators() {
        UUID companyId = currentUserProvider.requireCompanyId();
        Company company = companyRepository.findById(companyId).orElseThrow(() -> new NotFoundException("Company not found"));

        List<String> matterIds = matterSetResolverService.resolveApplicableMatters(company).stream()
                .map(SustainabilityMatter::getId)
                .toList();
        List<IndicatorDefinition> defs = indicatorDefinitionRepository.findByMatterIdIn(matterIds);
        List<String> defIds = defs.stream().map(IndicatorDefinition::getId).toList();

        Map<String, TenantIndicator> overrides = tenantIndicatorRepository
                .findByCompanyIdAndIndicatorDefinitionIdIn(companyId, defIds).stream()
                .collect(Collectors.toMap(ti -> ti.getIndicatorDefinition().getId(), ti -> ti));

        Map<String, List<IndicatorValue>> valuesByDef = indicatorValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdIn(companyId, defIds).stream()
                .collect(Collectors.groupingBy(v -> v.getIndicatorDefinition().getId()));

        Map<String, List<IndicatorMonthlyValue>> monthlyByDef = indicatorMonthlyValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdIn(companyId, defIds).stream()
                .collect(Collectors.groupingBy(v -> v.getIndicatorDefinition().getId()));

        Map<String, List<IndicatorAuditEntry>> historyByDef = auditEntryRepository
                .findByCompanyIdAndIndicatorDefinitionIdInOrderByCreatedAtDesc(companyId, defIds).stream()
                .collect(Collectors.groupingBy(a -> a.getIndicatorDefinition().getId()));

        return defs.stream()
                .map(def -> toResponse(def, overrides.get(def.getId()),
                        valuesByDef.getOrDefault(def.getId(), List.of()),
                        monthlyByDef.getOrDefault(def.getId(), List.of()),
                        historyByDef.getOrDefault(def.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public IndicatorResponse getIndicator(String indicatorDefinitionId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        IndicatorDefinition def = requireDefinition(indicatorDefinitionId);

        TenantIndicator override = tenantIndicatorRepository
                .findByCompanyIdAndIndicatorDefinitionId(companyId, indicatorDefinitionId).orElse(null);
        List<IndicatorValue> values = indicatorValueRepository.findByCompanyIdAndIndicatorDefinitionId(companyId, indicatorDefinitionId);
        List<IndicatorMonthlyValue> monthlyValues = indicatorMonthlyValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdIn(companyId, List.of(indicatorDefinitionId));
        List<IndicatorAuditEntry> history = auditEntryRepository.findByCompanyIdAndIndicatorDefinitionIdOrderByCreatedAtDesc(companyId, indicatorDefinitionId);

        return toResponse(def, override, values, monthlyValues, history);
    }

    @Transactional
    public IndicatorResponse setValue(String indicatorDefinitionId, int fiscalYear, SetIndicatorValueRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        IndicatorDefinition def = requireDefinition(indicatorDefinitionId);
        if (def.getAggregationRule() != AggregationRule.DIRECT_ANNUAL) {
            throw new ConflictException("This indicator's annual value is computed from monthly entries — use the monthly entry endpoint instead");
        }
        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        IndicatorValue value = indicatorValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(companyId, indicatorDefinitionId, fiscalYear)
                .orElseGet(() -> {
                    IndicatorValue v = new IndicatorValue();
                    v.setCompanyId(companyId);
                    v.setIndicatorDefinition(def);
                    v.setFiscalYear(fiscalYear);
                    return v;
                });
        value.setValue(request.value());
        value.setComputed(false);
        // Any edit invalidates a prior approval — the figure needs re-approval by a Company Admin.
        value.setStatus(IndicatorValueStatus.DRAFT);
        value.setApprovedByName(null);
        value.setApprovedAt(null);
        indicatorValueRepository.save(value);

        IndicatorAuditEntry entry = new IndicatorAuditEntry();
        entry.setCompanyId(companyId);
        entry.setIndicatorDefinition(def);
        entry.setFiscalYear(fiscalYear);
        entry.setValue(request.value());
        entry.setEnteredBy(user.getName());
        entry.setSourceDocName(request.sourceDocName());
        entry.setComment(request.comment());
        auditEntryRepository.save(entry);

        return getIndicator(indicatorDefinitionId);
    }

    /**
     * Upserts one month's entry, then recomputes the disclosure-facing annual IndicatorValue from
     * all monthly entries recorded so far for that fiscal year (PRD/SRS: the user never manually
     * totals monthly figures). The monthly entry itself is also logged as an IndicatorAuditEntry
     * (with {@code month} set) so it carries the same append-only who/when/source history annual
     * corrections already have.
     */
    @Transactional
    public IndicatorResponse setMonthlyValue(String indicatorDefinitionId, int fiscalYear, int month, SetIndicatorValueRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        IndicatorDefinition def = requireDefinition(indicatorDefinitionId);
        if (def.getAggregationRule() == AggregationRule.DIRECT_ANNUAL) {
            throw new ConflictException("This indicator is entered as a direct annual figure, not monthly");
        }
        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        IndicatorMonthlyValue monthly = indicatorMonthlyValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdAndFiscalYearAndMonth(companyId, indicatorDefinitionId, fiscalYear, month)
                .orElseGet(() -> {
                    IndicatorMonthlyValue m = new IndicatorMonthlyValue();
                    m.setCompanyId(companyId);
                    m.setIndicatorDefinition(def);
                    m.setFiscalYear(fiscalYear);
                    m.setMonth(month);
                    return m;
                });
        monthly.setValue(request.value());
        indicatorMonthlyValueRepository.save(monthly);

        IndicatorAuditEntry entry = new IndicatorAuditEntry();
        entry.setCompanyId(companyId);
        entry.setIndicatorDefinition(def);
        entry.setFiscalYear(fiscalYear);
        entry.setMonth(month);
        entry.setValue(request.value());
        entry.setEnteredBy(user.getName());
        entry.setSourceDocName(request.sourceDocName());
        entry.setComment(request.comment());
        auditEntryRepository.save(entry);

        recomputeAnnualValue(companyId, def, fiscalYear);

        return getIndicator(indicatorDefinitionId);
    }

    private void recomputeAnnualValue(UUID companyId, IndicatorDefinition def, int fiscalYear) {
        List<IndicatorMonthlyValue> monthlyValues = indicatorMonthlyValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(companyId, def.getId(), fiscalYear);
        BigDecimal computed = computeAnnualValue(def.getAggregationRule(), monthlyValues);
        if (computed == null) {
            return;
        }

        IndicatorValue value = indicatorValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(companyId, def.getId(), fiscalYear)
                .orElseGet(() -> {
                    IndicatorValue v = new IndicatorValue();
                    v.setCompanyId(companyId);
                    v.setIndicatorDefinition(def);
                    v.setFiscalYear(fiscalYear);
                    return v;
                });
        value.setValue(computed);
        value.setComputed(true);
        // A monthly correction invalidates prior sign-off on the annual figure, same as a direct edit does.
        value.setStatus(IndicatorValueStatus.DRAFT);
        value.setApprovedByName(null);
        value.setApprovedAt(null);
        indicatorValueRepository.save(value);
    }

    /** SUM and COUNT are the same arithmetic (sum of entered months) — COUNT is a presentational label for event-count indicators. */
    static BigDecimal computeAnnualValue(AggregationRule rule, List<IndicatorMonthlyValue> monthly) {
        List<BigDecimal> values = monthly.stream()
                .map(IndicatorMonthlyValue::getValue)
                .filter(Objects::nonNull)
                .toList();
        if (values.isEmpty()) {
            return null;
        }
        return switch (rule) {
            case SUM, COUNT -> values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            case AVERAGE -> values.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(values.size()), 4, RoundingMode.HALF_UP);
            case LATEST -> monthly.stream()
                    .filter(m -> m.getValue() != null)
                    .max(Comparator.comparingInt(IndicatorMonthlyValue::getMonth))
                    .map(IndicatorMonthlyValue::getValue)
                    .orElse(null);
            case DIRECT_ANNUAL -> throw new IllegalStateException("DIRECT_ANNUAL indicators don't aggregate from monthly values");
        };
    }

    @Transactional
    public IndicatorResponse setTarget(String indicatorDefinitionId, SetIndicatorTargetRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        IndicatorDefinition def = requireDefinition(indicatorDefinitionId);

        TenantIndicator override = tenantIndicatorRepository
                .findByCompanyIdAndIndicatorDefinitionId(companyId, indicatorDefinitionId)
                .orElseGet(() -> {
                    TenantIndicator ti = new TenantIndicator();
                    ti.setCompanyId(companyId);
                    ti.setIndicatorDefinition(def);
                    return ti;
                });
        override.setTarget(request.target());
        override.setTargetDirection(request.targetDirection());
        tenantIndicatorRepository.save(override);

        return getIndicator(indicatorDefinitionId);
    }

    /** Board/management sign-off on a reported figure — mirrors materiality's Draft/Validated pattern. */
    @Transactional
    public IndicatorResponse approveValue(String indicatorDefinitionId, int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        IndicatorValue value = indicatorValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(companyId, indicatorDefinitionId, fiscalYear)
                .orElseThrow(() -> new NotFoundException("No value recorded for this indicator and fiscal year"));
        if (value.getStatus() == IndicatorValueStatus.APPROVED) {
            throw new ConflictException("This value has already been approved");
        }

        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        value.setStatus(IndicatorValueStatus.APPROVED);
        value.setApprovedByName(user.getName());
        value.setApprovedAt(Instant.now());
        indicatorValueRepository.save(value);

        return getIndicator(indicatorDefinitionId);
    }

    private IndicatorDefinition requireDefinition(String id) {
        return indicatorDefinitionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Unknown indicator id: " + id));
    }

    private IndicatorResponse toResponse(IndicatorDefinition def, TenantIndicator override, List<IndicatorValue> values,
                                          List<IndicatorMonthlyValue> monthlyValues, List<IndicatorAuditEntry> history) {
        var effectiveTarget = override != null && override.getTarget() != null ? override.getTarget() : def.getDefaultTarget();
        var effectiveDirection = override != null && override.getTargetDirection() != null ? override.getTargetDirection() : def.getDefaultTargetDirection();
        boolean enabled = override == null || Boolean.TRUE.equals(override.getEnabled());

        Map<Integer, Long> monthsReportedByYear = monthlyValues.stream()
                .filter(m -> m.getValue() != null)
                .collect(Collectors.groupingBy(IndicatorMonthlyValue::getFiscalYear, Collectors.counting()));

        // Pair each monthly value with the most recent audit entry for that (fiscalYear, month), for
        // the drill-down's enteredBy/source display — history is already ordered by createdAt desc.
        Map<String, IndicatorAuditEntry> latestAuditByYearMonth = new java.util.HashMap<>();
        for (IndicatorAuditEntry entry : history) {
            if (entry.getMonth() == null) continue;
            latestAuditByYearMonth.putIfAbsent(entry.getFiscalYear() + ":" + entry.getMonth(), entry);
        }

        return new IndicatorResponse(
                def.getId(),
                def.getName(),
                def.getUnit(),
                def.getMatter().getId(),
                def.getCategory(),
                Boolean.TRUE.equals(def.getSectorSpecific()),
                def.getSector() != null ? def.getSector().getCode() : null,
                effectiveTarget,
                effectiveDirection,
                enabled,
                def.getAggregationRule(),
                values.stream().map(v -> new IndicatorValuePointDto(
                        v.getFiscalYear(), v.getValue(), v.getStatus(), v.getApprovedByName(), v.getApprovedAt(),
                        Boolean.TRUE.equals(v.getComputed()),
                        monthsReportedByYear.getOrDefault(v.getFiscalYear(), 0L).intValue()
                )).toList(),
                monthlyValues.stream()
                        .sorted(Comparator.comparingInt(IndicatorMonthlyValue::getFiscalYear).thenComparingInt(IndicatorMonthlyValue::getMonth))
                        .map(m -> {
                            IndicatorAuditEntry audit = latestAuditByYearMonth.get(m.getFiscalYear() + ":" + m.getMonth());
                            return new IndicatorMonthlyValueDto(
                                    m.getFiscalYear(), m.getMonth(), m.getValue(),
                                    audit != null ? audit.getEnteredBy() : null,
                                    audit != null ? audit.getCreatedAt() : m.getUpdatedAt(),
                                    audit != null ? audit.getSourceDocName() : null,
                                    audit != null ? audit.getSourceDocPath() : null
                            );
                        }).toList(),
                history.stream().map(AuditEntryDto::from).toList()
        );
    }
}
