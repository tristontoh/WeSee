package com.wesee.esg.extraction.dto;

import java.math.BigDecimal;

/** Every field optional; a null means "use what was proposed". */
public record AcceptRecordRequest(BigDecimal value, Integer fiscalYear, Integer month) {
}
