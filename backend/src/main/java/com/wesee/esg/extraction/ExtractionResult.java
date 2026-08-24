package com.wesee.esg.extraction;

import java.util.List;

public record ExtractionResult(String modelUsed, List<ProposedRecord> records) {
}
