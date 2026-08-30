/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
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
        String sourceSnippet,
        /** 1-based page the figure was read from; null when the document has no pages or the model could not tell. */
        Integer sourcePage
) {
}
