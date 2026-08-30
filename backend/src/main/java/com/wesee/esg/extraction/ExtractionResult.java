/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.extraction;

import java.util.List;

/**
 * One read of a document: the figures it implies, and a copy of what it says.
 *
 * <p>The two travel together but are kept apart. {@code records} are claims that need a person to
 * accept them before they count; {@code transcription} is descriptive and needs nobody.
 */
public record ExtractionResult(String modelUsed,
                               List<ProposedRecord> records,
                               DocumentTranscription transcription) {

    public ExtractionResult {
        transcription = transcription != null ? transcription : DocumentTranscription.empty();
    }
}
