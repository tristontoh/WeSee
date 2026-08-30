/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.extraction;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

/**
 * What the document says, transcribed rather than interpreted.
 *
 * <p>Separate from {@link ProposedRecord} on purpose. A proposal is a claim about a reportable
 * figure and has to be accepted before it counts; a transcription is a copy of the page, and
 * accepting it would mean nothing. Keeping the two apart is what lets everything on a bill be
 * captured without anything being forced into an indicator whose meaning does not fit — an amount
 * payable in MYR is recorded here as the amount payable, not as community investment.
 *
 * <p>Tables rather than label/value pairs alone, because a utility bill mostly is tables: a meter
 * table carries a reading per row, and flattening it would drop the rate beside a usage figure or
 * the unit beside a reading. {@code kVARh} sitting in its own row next to {@code kWh} is exactly the
 * kind of distinction a reviewer needs and a flattened pair would lose.
 */
public record DocumentTranscription(List<Field> fields, List<Table> tables) {

    public DocumentTranscription {
        fields = fields != null ? List.copyOf(fields) : List.of();
        tables = tables != null ? List.copyOf(tables) : List.of();
    }

    public static DocumentTranscription empty() {
        return new DocumentTranscription(List.of(), List.of());
    }

    /**
     * Ignored for json on purpose. Hibernate stores this record as jsonb through Jackson, which
     * reads a getter-shaped method as a property — without this the column gains an {@code empty}
     * key that no constructor parameter matches, and every read of the row fails.
     */
    @JsonIgnore
    public boolean isEmpty() {
        return fields.isEmpty() && tables.isEmpty();
    }

    /**
     * A labelled value printed outside any table — an account number, a billing period.
     *
     * <p>{@code labelEnglish} is a reading aid, not a replacement: a Malaysian utility bill prints
     * "Tempoh Bil", and this card's job is to show what the page says, so the original is what is
     * displayed and the gloss sits beside it. Null on rows transcribed before glossing existed, and
     * null when the label is already English — there is nothing to gloss then.
     *
     * <p>The value is never glossed. It is a figure, a date or an account number; translating one
     * would be inventing data.
     */
    public record Field(String label, String labelEnglish, String value) {
    }

    /**
     * One table, as printed. {@code rows} are ragged if the document is.
     *
     * <p>{@code titleEnglish} and {@code columnsEnglish} gloss the headings for the same reason as
     * {@link Field#labelEnglish}. {@code columnsEnglish} is positional — index i glosses column i —
     * and is empty when the model returned nothing, so a caller must tolerate it being shorter than
     * {@code columns} rather than assuming they pair up. Cells are never glossed.
     */
    public record Table(String title, String titleEnglish, List<String> columns,
                        List<String> columnsEnglish, List<List<String>> rows,
                        List<List<String>> rowsEnglish) {

        public Table {
            columns = columns != null ? List.copyOf(columns) : List.of();
            columnsEnglish = columnsEnglish != null ? List.copyOf(columnsEnglish) : List.of();
            rows = rows != null ? rows.stream().map(r -> r != null ? List.copyOf(r) : List.<String>of()).toList() : List.of();
            // Stream.toList rather than List.copyOf: a gloss is absent for any cell holding a
            // figure or an identifier, so this list has to tolerate nulls where rows does not.
            rowsEnglish = rowsEnglish != null
                    ? rowsEnglish.stream().map(r -> r != null ? r.stream().toList() : List.<String>of()).toList()
                    : List.of();
        }

        /** The gloss for column {@code index}, or null when the model gave none for it. */
        public String columnEnglish(int index) {
            return index < columnsEnglish.size() ? columnsEnglish.get(index) : null;
        }

        /**
         * The gloss for one cell, or null when there is none — which is the normal case for a
         * figure, a date or a code. Both dimensions are checked: {@code rowsEnglish} is positional
         * and the model may return it shorter than {@code rows}, or omit it entirely.
         */
        public String cellEnglish(int rowIndex, int columnIndex) {
            if (rowIndex >= rowsEnglish.size()) {
                return null;
            }
            List<String> row = rowsEnglish.get(rowIndex);
            if (row == null || columnIndex >= row.size()) {
                return null;
            }
            String gloss = row.get(columnIndex);
            return gloss == null || gloss.isBlank() ? null : gloss;
        }
    }
}
