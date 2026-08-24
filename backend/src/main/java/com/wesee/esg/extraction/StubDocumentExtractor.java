package com.wesee.esg.extraction;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Backs every test so the suite never makes a network call. Proposes a fixed electricity reading
 * against whichever grid factor and electricity indicator the tenant actually has, exercising the
 * two-destination path end to end.
 *
 * <p>No longer a placeholder for an unchosen provider — {@link GeminiDocumentExtractor} is the
 * default now, and this is a test double. It must be selected deliberately
 * ({@code wesee.extraction.provider=stub}, which {@code application-test.yml} pins): the figures
 * below are invented, and nothing that reads a real document should ever be able to fall back to
 * them by accident.
 *
 * <p>A property switch rather than {@code @ConditionalOnMissingBean}: that annotation is only
 * dependable inside auto-configuration, since during component scanning the definition order is not
 * guaranteed.
 */
@Component
@ConditionalOnProperty(name = "wesee.extraction.provider", havingValue = "stub")
public class StubDocumentExtractor implements DocumentExtractor {

    static final BigDecimal STUB_KWH = new BigDecimal("1240");

    @Override
    public ExtractionResult extract(byte[] content, String contentType, ExtractionContext context) {
        List<ProposedRecord> records = new ArrayList<>();

        context.factors().stream()
                .filter(f -> f.id().equals("GRID_ELECTRICITY_MY"))
                .findFirst()
                .ifPresent(f -> records.add(new ProposedRecord(
                        ExtractionTargetType.EMISSION_ACTIVITY, f.id(), STUB_KWH, "kWh",
                        context.defaultFiscalYear(), null, new BigDecimal("0.900"),
                        "Total consumption: 1,240 kWh")));

        context.indicators().stream()
                .filter(i -> i.id().equals("IND-ENG-01"))
                .findFirst()
                .ifPresent(i -> records.add(new ProposedRecord(
                        ExtractionTargetType.INDICATOR_VALUE, i.id(), STUB_KWH, "kWh",
                        context.defaultFiscalYear(), null, new BigDecimal("0.900"),
                        "Total consumption: 1,240 kWh")));

        return new ExtractionResult("stub", records);
    }
}
