package com.wesee.esg.reference;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IndicatorDefinitionRepository extends JpaRepository<IndicatorDefinition, String> {

    /**
     * Ordered explicitly. This drives the row order of the indicator data-entry grid, and an
     * unordered scan gives no guarantee of one — nor a stable one once a definition is edited,
     * since Postgres rewrites the tuple. Category-then-name matches how matters are ordered.
     * Ordering by {@code id} would not work: the ids are text, so BURSA-10 sorts before BURSA-2.
     */
    List<IndicatorDefinition> findByMatterIdInOrderByCategoryAscNameAsc(List<String> matterIds);

    /** Ordered for the same reason as {@link #findByMatterIdInOrderByCategoryAscNameAsc}. */
    List<IndicatorDefinition> findAllByOrderByCategoryAscNameAsc();

    List<IndicatorDefinition> findBySectorSpecificTrueAndSector_Code(String sectorCode);
}
