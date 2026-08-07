package com.wesee.esg.reference;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IndicatorDefinitionRepository extends JpaRepository<IndicatorDefinition, String> {
    List<IndicatorDefinition> findByMatterIdIn(List<String> matterIds);
    List<IndicatorDefinition> findBySectorSpecificTrueAndSector_Code(String sectorCode);
}
