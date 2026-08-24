package com.wesee.esg.extraction;

import java.util.List;

/**
 * The closed set an extractor may choose from. Passing the tenant's real factors and indicators
 * in — rather than letting a model name whatever it likes — is what keeps proposals resolvable.
 */
public record ExtractionContext(
        List<FactorOption> factors,
        List<IndicatorOption> indicators,
        int defaultFiscalYear
) {
    public record FactorOption(String id, String name, String activityUnit) {
    }

    public record IndicatorOption(String id, String name, String unit) {
    }
}
