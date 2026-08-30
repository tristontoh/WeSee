package com.wesee.esg.indicators.dto;

import com.wesee.esg.indicators.IndicatorAuditEntry;

import java.math.BigDecimal;
import java.time.Instant;

public record AuditEntryDto(
        java.util.UUID id,
        int fiscalYear,
        Integer month,
        BigDecimal value,
        String enteredBy,
        Instant enteredAt,
        String sourceDocName,
        String sourceDocPath,
        /** 1-based page of the source document, so a report can cite where and not only which. */
        Integer sourcePage,
        /** The sentence the figure was read from, verbatim. */
        String sourceQuote,
        String comment
) {
    public static AuditEntryDto from(IndicatorAuditEntry e) {
        return new AuditEntryDto(e.getId(), e.getFiscalYear(), e.getMonth(), e.getValue(), e.getEnteredBy(), e.getCreatedAt(), e.getSourceDocName(), e.getSourceDocPath(), e.getSourcePage(), e.getSourceQuote(), e.getComment());
    }
}
