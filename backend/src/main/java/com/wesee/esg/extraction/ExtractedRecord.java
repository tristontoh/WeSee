package com.wesee.esg.extraction;

import com.wesee.esg.climate.EmissionFactor;
import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.reference.IndicatorDefinition;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One record a document implies. A single electricity bill yields two of these: an
 * EMISSION_ACTIVITY row (kWh against a grid factor) and an INDICATOR_VALUE row (MWh against
 * IND-ENG-01). They are reviewed and accepted together.
 */
@Entity
@Table(name = "extracted_record")
@Getter
@Setter
@NoArgsConstructor
public class ExtractedRecord extends TenantOwnedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private ExtractedDocument document;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private ExtractionTargetType targetType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emission_factor_id")
    private EmissionFactor emissionFactor;

    @Column(precision = 18, scale = 4)
    private BigDecimal quantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "indicator_definition_id")
    private IndicatorDefinition indicatorDefinition;

    @Column
    private Integer month;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal value;

    @Column(name = "unit_as_read", length = 30)
    private String unitAsRead;

    @Column(precision = 4, scale = 3)
    private BigDecimal confidence;

    @Column(name = "source_snippet", columnDefinition = "TEXT")
    private String sourceSnippet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecordStatus status = RecordStatus.PROPOSED;

    @Column(name = "committed_entity_id")
    private UUID committedEntityId;
}
