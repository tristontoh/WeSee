package com.wesee.esg.extraction.dto;

import com.wesee.esg.extraction.ExtractedRecord;
import com.wesee.esg.extraction.ExtractionTargetType;
import com.wesee.esg.extraction.RecordStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record ExtractedRecordResponse(
        UUID id,
        ExtractionTargetType targetType,
        String targetId,
        String targetName,
        BigDecimal value,
        /**
         * The unit {@code value} is in — the target's own, after conversion. Distinct from
         * {@code unitAsRead}: a bill printed in kWh becomes 1.24 against an indicator kept in MWh,
         * and labelling that 1.24 "kWh" would misstate it by a factor of a thousand.
         */
        String unit,
        String unitAsRead,
        Integer fiscalYear,
        Integer month,
        BigDecimal confidence,
        String sourceSnippet,
        RecordStatus status
) {
    public static ExtractedRecordResponse from(ExtractedRecord record) {
        boolean emission = record.getTargetType() == ExtractionTargetType.EMISSION_ACTIVITY;
        return new ExtractedRecordResponse(
                record.getId(),
                record.getTargetType(),
                emission ? record.getEmissionFactor().getId() : record.getIndicatorDefinition().getId(),
                emission ? record.getEmissionFactor().getName() : record.getIndicatorDefinition().getName(),
                record.getValue(),
                emission ? record.getEmissionFactor().getActivityUnit()
                        : record.getIndicatorDefinition().getUnit(),
                record.getUnitAsRead(),
                record.getFiscalYear(),
                record.getMonth(),
                record.getConfidence(),
                record.getSourceSnippet(),
                record.getStatus());
    }
}
