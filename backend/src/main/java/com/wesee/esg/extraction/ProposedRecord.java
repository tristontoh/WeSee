package com.wesee.esg.extraction;

import java.math.BigDecimal;

/**
 * One record an extractor believes a document implies. {@code targetId} is untrusted at this
 * point — it is whatever the extractor named, and is resolved against the closed set before it
 * becomes a foreign key.
 */
public record ProposedRecord(
        ExtractionTargetType targetType,
        String targetId,
        BigDecimal value,
        String unitAsRead,
        Integer fiscalYear,
        Integer month,
        BigDecimal confidence,
        String sourceSnippet
) {
}
