package com.wesee.esg.extraction;

import com.wesee.esg.assurance.SignOffRecord;
import com.wesee.esg.assurance.SignOffRecordRepository;
import com.wesee.esg.climate.EmissionActivityService;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.extraction.dto.AcceptRecordRequest;
import com.wesee.esg.extraction.dto.ExtractedRecordResponse;
import com.wesee.esg.reference.AggregationRule;
import com.wesee.esg.indicators.IndicatorAuditEntry;
import com.wesee.esg.indicators.IndicatorAuditEntryRepository;
import com.wesee.esg.indicators.IndicatorValue;
import com.wesee.esg.indicators.IndicatorService;
import com.wesee.esg.indicators.IndicatorValueRepository;
import com.wesee.esg.indicators.dto.SetIndicatorValueRequest;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Turns an accepted proposal into a real record, or discards it. */
@Service
public class ExtractionReviewService {

    private final ExtractedRecordRepository recordRepository;
    private final IndicatorValueRepository indicatorValueRepository;
    private final IndicatorAuditEntryRepository auditEntryRepository;
    private final SignOffRecordRepository signOffRepository;
    private final EmissionActivityService emissionActivityService;
    private final IndicatorService indicatorService;
    private final AppUserRepository appUserRepository;
    private final CurrentUserProvider currentUserProvider;

    public ExtractionReviewService(ExtractedRecordRepository recordRepository,
                                    IndicatorValueRepository indicatorValueRepository,
                                    IndicatorAuditEntryRepository auditEntryRepository,
                                    SignOffRecordRepository signOffRepository,
                                    EmissionActivityService emissionActivityService,
                                    IndicatorService indicatorService,
                                    AppUserRepository appUserRepository,
                                    CurrentUserProvider currentUserProvider) {
        this.recordRepository = recordRepository;
        this.indicatorValueRepository = indicatorValueRepository;
        this.auditEntryRepository = auditEntryRepository;
        this.signOffRepository = signOffRepository;
        this.emissionActivityService = emissionActivityService;
        this.indicatorService = indicatorService;
        this.appUserRepository = appUserRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public ExtractedRecordResponse accept(UUID recordId, AcceptRecordRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        ExtractedRecord record = recordRepository.findByIdAndCompanyId(recordId, companyId)
                .orElseThrow(() -> new NotFoundException("Extracted record not found"));
        if (record.getStatus() != RecordStatus.PROPOSED) {
            throw new ConflictException("This record has already been reviewed");
        }

        BigDecimal value = request.value() != null ? request.value() : record.getValue();
        Integer fiscalYear = request.fiscalYear() != null ? request.fiscalYear() : record.getFiscalYear();
        Integer month = Boolean.TRUE.equals(request.clearMonth())
                ? null
                : request.month() != null ? request.month() : record.getMonth();

        Set<Integer> signedYears = signOffRepository.findByCompanyIdOrderByFiscalYearDesc(companyId).stream()
                .map(SignOffRecord::getFiscalYear)
                .collect(Collectors.toSet());
        if (SignOffGuard.isYearLocked(fiscalYear, signedYears)) {
            throw new ConflictException("FY" + fiscalYear + " has already been signed off — "
                    + "accepting this would invalidate its assurance hash. Revoke the sign-off first.");
        }

        UUID committedId = record.getTargetType() == ExtractionTargetType.EMISSION_ACTIVITY
                ? commitEmissionActivity(record, fiscalYear, value)
                : commitIndicatorValue(record, companyId, fiscalYear, month, value);

        record.setStatus(RecordStatus.ACCEPTED);
        record.setCommittedEntityId(committedId);
        return ExtractedRecordResponse.from(recordRepository.save(record));
    }

    @Transactional
    public ExtractedRecordResponse reject(UUID recordId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        ExtractedRecord record = recordRepository.findByIdAndCompanyId(recordId, companyId)
                .orElseThrow(() -> new NotFoundException("Extracted record not found"));
        if (record.getStatus() != RecordStatus.PROPOSED) {
            throw new ConflictException("This record has already been reviewed");
        }
        record.setStatus(RecordStatus.REJECTED);
        return ExtractedRecordResponse.from(recordRepository.save(record));
    }

    /** Reuses EmissionActivityService so the tCO2e maths lives in exactly one place. */
    private UUID commitEmissionActivity(ExtractedRecord record, Integer fiscalYear, BigDecimal quantity) {
        return emissionActivityService
                .addEntry(fiscalYear, record.getEmissionFactor().getId(), quantity)
                .id();
    }

    private UUID commitIndicatorValue(ExtractedRecord record, UUID companyId,
                                       Integer fiscalYear, Integer month, BigDecimal value) {
        String definitionId = record.getIndicatorDefinition().getId();

        /*
         * A bill covers one month, and most consumption indicators roll twelve of those up
         * (IND-ENG-01 and IND-WAT-01 are both SUM). Writing the annual figure directly — which is
         * what this did — meant accepting February's bill and then March's left the year showing
         * March alone, because each accept overwrote the total instead of adding a month.
         *
         * So a dated reading goes through IndicatorService.setMonthlyValue, exactly as a hand-typed
         * monthly figure does: it stores the month, writes the audit entry, and recomputes the
         * annual value with the indicator's own aggregation rule. Only an undated reading, or an
         * indicator that is genuinely entered as a single annual figure, still writes the year.
         */
        if (routesThroughMonthly(record.getIndicatorDefinition().getAggregationRule(), month)) {
            indicatorService.setMonthlyValue(definitionId, fiscalYear, month,
                    new SetIndicatorValueRequest(value,
                            record.getDocument().getOriginalFileName(),
                            record.getDocument().getStoredPath(),
                            "Extracted from " + record.getDocument().getOriginalFileName()));

            // The annual row is created or updated by the recompute inside setMonthlyValue; its id
            // is what the record points at, so the report figure stays traceable to this reading.
            return indicatorValueRepository
                    .findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(companyId, definitionId, fiscalYear)
                    .map(IndicatorValue::getId)
                    .orElseThrow(() -> new IllegalStateException(
                            "No annual value after recomputing " + definitionId + " FY" + fiscalYear));
        }

        IndicatorValue indicatorValue = indicatorValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(companyId, definitionId, fiscalYear)
                .orElseGet(() -> {
                    IndicatorValue v = new IndicatorValue();
                    v.setCompanyId(companyId);
                    v.setIndicatorDefinition(record.getIndicatorDefinition());
                    v.setFiscalYear(fiscalYear);
                    return v;
                });
        indicatorValue.setValue(value);
        indicatorValue.setComputed(false);
        indicatorValueRepository.save(indicatorValue);

        // The audit entry is what makes an extracted value indistinguishable in structure from a
        // manual entry with evidence attached — same fields, same trail, provenance preserved.
        IndicatorAuditEntry audit = new IndicatorAuditEntry();
        audit.setCompanyId(companyId);
        audit.setIndicatorDefinition(record.getIndicatorDefinition());
        audit.setFiscalYear(fiscalYear);
        audit.setMonth(month);
        audit.setValue(value);
        audit.setEnteredBy(displayName());
        audit.setSourceDocName(record.getDocument().getOriginalFileName());
        // Where in the document, not just which one — copied now so the citation survives a
        // re-extraction of the source.
        audit.setSourcePage(record.getSourcePage());
        audit.setSourceQuote(record.getSourceSnippet());
        audit.setSourceDocPath(record.getDocument().getStoredPath());
        audit.setComment("Extracted from " + record.getDocument().getOriginalFileName());
        auditEntryRepository.save(audit);

        return indicatorValue.getId();
    }

    /**
     * Whether a reading belongs in the monthly ledger rather than written straight onto the year.
     *
     * Both conditions matter. Without a month there is nowhere in the ledger to put it, and a
     * DIRECT_ANNUAL indicator has no ledger at all — setMonthlyValue rejects those outright.
     */
    static boolean routesThroughMonthly(AggregationRule rule, Integer month) {
        return month != null && rule != null && rule != AggregationRule.DIRECT_ANNUAL;
    }

    /** WeSeePrincipal carries no name, so the user is looked up — as IndicatorService does. */
    private String displayName() {
        return appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .map(AppUser::getName)
                .orElse(currentUserProvider.getPrincipal().email());
    }
}
