package com.wesee.esg.extraction;

import com.google.genai.types.Schema;
import com.google.genai.types.Type;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Builds the two halves of a request from a tenant's own closed set.
 *
 * <p>They do different jobs. The schema constrains shape — it makes naming a factor the tenant does
 * not have structurally impossible. The prompt carries meaning the schema cannot express: which line
 * of a bill to read, and which of the two records a reading belongs to.
 */
final class ExtractionPromptFactory {

    private ExtractionPromptFactory() {
    }

    static String promptFor(ExtractionContext context) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("""
                You are reading one Malaysian utility bill, fuel invoice or logistics manifest. \
                Labels may be in Malay, English, or both in the same document — for example \
                "Jumlah Penggunaan" is the total consumption.

                """);

        prompt.append("Emission factors this company has (the only ones you may name):\n");
        for (ExtractionContext.FactorOption factor : context.factors()) {
            prompt.append("  ").append(factor.id())
                    .append(" — ").append(factor.name())
                    .append(" — measured in ").append(factor.activityUnit()).append('\n');
        }

        prompt.append("\nIndicators this company has (the only ones you may name):\n");
        for (ExtractionContext.IndicatorOption indicator : context.indicators()) {
            prompt.append("  ").append(indicator.id())
                    .append(" — ").append(indicator.name())
                    .append(" — measured in ").append(indicator.unit()).append('\n');
        }

        prompt.append("""

                Rules:
                - Propose only figures you actually read on the document. If you cannot find a \
                figure, return no record for it rather than an estimate. Returning an empty list \
                is a correct answer for a document that carries none.
                - One bill often implies two records: the activity itself (an emission factor) and \
                the indicator that reports it. Propose both when both apply.
                - Report unitAsRead exactly as the document prints it. Do not convert between \
                units — converting is done afterwards, and a value converted twice is wrong by \
                orders of magnitude while still looking plausible.
                - Quote sourceSnippet verbatim from the document: it is what a person checks the \
                figure against.
                - Set month only when the document covers one specific month; leave it out for a \
                bill spanning a longer period.
                - confidence runs from 0 to 1 and should reflect how clearly the figure was printed.
                """);

        prompt.append("- Use fiscal year ").append(context.defaultFiscalYear())
                .append(" unless the document states a different one.\n");

        return prompt.toString();
    }

    static Schema schemaFor(ExtractionContext context) {
        List<String> targetIds = Stream.concat(
                        context.factors().stream().map(ExtractionContext.FactorOption::id),
                        context.indicators().stream().map(ExtractionContext.IndicatorOption::id))
                .toList();

        Map<String, Schema> fields = new LinkedHashMap<>();
        fields.put("targetType", enumField(List.of(
                ExtractionTargetType.EMISSION_ACTIVITY.name(),
                ExtractionTargetType.INDICATOR_VALUE.name()),
                "EMISSION_ACTIVITY for an emission factor, INDICATOR_VALUE for an indicator."));
        fields.put("targetId", enumField(targetIds, "The id of the factor or indicator this reading belongs to."));
        fields.put("value", field(Type.Known.NUMBER, "The figure as printed, without conversion."));
        fields.put("unitAsRead", field(Type.Known.STRING, "The unit as the document prints it, e.g. kWh."));
        fields.put("fiscalYear", field(Type.Known.INTEGER, "The fiscal year this reading belongs to."));
        fields.put("month", field(Type.Known.INTEGER, "1-12, only when the document covers one month."));
        fields.put("confidence", field(Type.Known.NUMBER, "0 to 1."));
        fields.put("sourceSnippet", field(Type.Known.STRING, "The text this figure was read from, verbatim."));

        // month is absent: a bill covering a year names none, and requiring it would force an
        // invention rather than an omission.
        Schema record = Schema.builder()
                .type(new Type(Type.Known.OBJECT))
                .properties(fields)
                .required(new ArrayList<>(List.of("targetType", "targetId", "value", "unitAsRead",
                        "fiscalYear", "confidence", "sourceSnippet")))
                .build();

        return Schema.builder()
                .type(new Type(Type.Known.OBJECT))
                .properties(Map.of("records", Schema.builder()
                        .type(new Type(Type.Known.ARRAY))
                        .items(record)
                        .build()))
                .required(List.of("records"))
                .build();
    }

    private static Schema field(Type.Known type, String description) {
        return Schema.builder().type(new Type(type)).description(description).build();
    }

    private static Schema enumField(List<String> values, String description) {
        return Schema.builder()
                .type(new Type(Type.Known.STRING))
                .enum_(values)
                .description(description)
                .build();
    }
}
