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
        /**
         * The sustainability matter this reading belongs to — "Water Management", "Energy
         * Consumption & GHG Footprint". It is what makes a water bill distinguishable from an
         * electricity bill in a list of filenames, and it comes from the indicator's own matter
         * rather than from guessing at the id or the file name.
         *
         * Null for an emission-factor reading: a factor carries a scope, not a matter. Every
         * document that produces one also produces the paired indicator reading, so the document
         * still gets classified.
         */
        String matterId,
        String matterName,
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
                emission ? null : record.getIndicatorDefinition().getMatter().getId(),
                emission ? null : record.getIndicatorDefinition().getMatter().getName(),
                record.getStatus());
    }
}
