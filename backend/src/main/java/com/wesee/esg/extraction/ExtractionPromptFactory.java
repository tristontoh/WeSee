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
                - Read the whole document and propose every figure that matches one of the options \
                above — not only the first or the most prominent one. A bill usually carries \
                several.
                - Propose only figures you actually read on the document. If you cannot find a \
                figure, return no record for it rather than an estimate. Returning an empty list \
                is a correct answer for a document that carries none.
                - Match on what a figure means, not on whether it happens to share the same unit \
                as an option. An amount of money is not a community-investment figure just \
                because both are in MYR. If nothing above genuinely covers a figure, leave it out.
                - One bill often implies two records: the activity itself (an emission factor) and \
                the indicator that reports it. Propose both when both apply.
                - When a document breaks a quantity into components — peak and off-peak \
                electricity, several meters, a line per month — propose each component against \
                the factor, and propose their total against the matching indicator. Say in \
                sourceSnippet when a figure is a sum, and quote the lines it was added from.
                - Report unitAsRead exactly as the document prints it. Do not convert between \
                units — converting is done afterwards, and a value converted twice is wrong by \
                orders of magnitude while still looking plausible.
                - Quote sourceSnippet verbatim from the document: it is what a person checks the \
                figure against.
                - Set month only when the document covers one specific month; leave it out for a \
                bill spanning a longer period.
                - confidence runs from 0 to 1 and should reflect how clearly the figure was printed.
                """);

        // The period the document covers decides the year. Phrasing this as a default with the
        // document as the exception put the current year ahead of a printed date: a utility bill
        // never "states a fiscal year", it states a billing period, so a June 2025 bill was read
        // as the current year on some runs and 2025 on others — the same document, two answers.
        prompt.append("- fiscalYear is the year of the period the document covers, taken from the ")
                .append("dates printed on it. Use ").append(context.defaultFiscalYear())
                .append(" only when the document carries no date at all.\n");

        // A reviewer opening a forty-page statement to check one figure needs the page, not the file.
        prompt.append("- sourcePage is the page the figure is printed on, counting from 1. Leave it ")
                .append("out rather than guess.\n");

        prompt.append("""

                Separately from those records, transcribe the document itself.

                - Put every labelled value printed outside a table into "fields" — the account
                number, the billing period, the tariff, the invoice number, the amount payable, the
                due date, the address. Keep the label in the language it is printed in.
                - Put every table on the page into "tables", with its column headings and one entry
                per row. A meter table has a row per reading; transcribe all of them, including
                rows for units other than the one you proposed a figure for, and including rows for
                a tenant or a sub-meter.
                - Transcribe exactly as printed. Keep the thousands separators, the currency
                prefixes, the units and the negative signs. Do not convert, round, total, reorder
                or translate anything here.
                - Alongside each label, table title and column heading, give a short English gloss in
                the matching "...English" property — "Tempoh Bil" glosses to "Billing period". The
                original stays as printed; the gloss is only there so a reader who does not read the
                document's language can follow it. Leave a gloss out when the text is already
                English.
                - Gloss the descriptive cells of a table too, through "rowsEnglish", which has the
                same shape as "rows": a line item like "Baki Terdahulu" is prose and glosses to
                "Previous balance". Put an empty string wherever a cell is a figure, a date, a code
                or an identifier — translating one of those would invent data. Never gloss the
                "value" of a field for the same reason: those are the figures themselves.
                - This is a copy of the page, not a set of proposals. A figure with no matching
                option belongs here and nowhere else — an amount payable is transcribed as an
                amount payable, and must not also appear as a record.
                """);

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
        fields.put("sourcePage", field(Type.Known.INTEGER,
                "1-based page the figure appears on. Omit for a single-page document or an image."));

        // month is absent: a bill covering a year names none, and requiring it would force an
        // invention rather than an omission.
        Schema record = Schema.builder()
                .type(new Type(Type.Known.OBJECT))
                .properties(fields)
                .required(new ArrayList<>(List.of("targetType", "targetId", "value", "unitAsRead",
                        "fiscalYear", "confidence", "sourceSnippet")))
                .build();

        Map<String, Schema> top = new LinkedHashMap<>();
        top.put("records", arrayOf(record, "The reportable figures this document implies."));
        top.put("fields", arrayOf(transcribedField(),
                "Every labelled value printed outside a table, in the order it appears."));
        top.put("tables", arrayOf(transcribedTable(),
                "Every table on the page, transcribed as printed."));

        // Only records is required: a document can legitimately carry no table, and a transcription
        // that came back empty should not fail the whole read.
        return Schema.builder()
                .type(new Type(Type.Known.OBJECT))
                .properties(top)
                .required(List.of("records"))
                .build();
    }

    private static Schema transcribedField() {
        Map<String, Schema> properties = new LinkedHashMap<>();
        properties.put("label", field(Type.Known.STRING, "The label as printed, in its own language."));
        properties.put("labelEnglish", field(Type.Known.STRING,
                "A short English gloss of the label. Omit when the label is already English."));
        properties.put("value", field(Type.Known.STRING, "The value as printed."));

        return Schema.builder()
                .type(new Type(Type.Known.OBJECT))
                .properties(properties)
                .required(new ArrayList<>(List.of("label", "value")))
                .build();
    }

    private static Schema transcribedTable() {
        Schema cells = arrayOf(field(Type.Known.STRING, "One cell, as printed."), "One row of cells.");

        Map<String, Schema> properties = new LinkedHashMap<>();
        properties.put("title", field(Type.Known.STRING, "The heading above the table, if it has one."));
        properties.put("titleEnglish", field(Type.Known.STRING,
                "A short English gloss of the title. Omit when it is already English."));
        properties.put("columns", arrayOf(field(Type.Known.STRING, "One column heading."),
                "The column headings, left to right."));
        properties.put("columnsEnglish", arrayOf(field(Type.Known.STRING, "One English gloss."),
                "An English gloss per column heading, in the same order as \"columns\"."));
        properties.put("rows", arrayOf(cells, "One entry per row, top to bottom."));
        properties.put("rowsEnglish", arrayOf(
                arrayOf(field(Type.Known.STRING,
                        "An English gloss for the cell in this position, or an empty string for a "
                                + "cell that is a figure, date, code or identifier."),
                        "One row of glosses, positionally matching the same row of \"rows\"."),
                "Glosses for the descriptive cells, in the same shape as \"rows\"."));

        return Schema.builder()
                .type(new Type(Type.Known.OBJECT))
                .properties(properties)
                .required(new ArrayList<>(List.of("columns", "rows")))
                .build();
    }

    private static Schema arrayOf(Schema items, String description) {
        return Schema.builder()
                .type(new Type(Type.Known.ARRAY))
                .items(items)
                .description(description)
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
