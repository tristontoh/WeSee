package com.wesee.esg.extraction.dto;

import java.math.BigDecimal;

/** Every field optional; a null means "use what was proposed". */
public record AcceptRecordRequest(
        BigDecimal value,
        Integer fiscalYear,
        Integer month,
        /**
         * File the reading against the whole year, discarding the month the model proposed.
         *
         * A null {@code month} cannot say this on its own: absent and explicitly-null look the same
         * once parsed, and the accept path falls back to the record's own month for both — so a
         * reviewer who chose "Whole year" silently got the model's guess instead.
         */
        Boolean clearMonth) {
}
