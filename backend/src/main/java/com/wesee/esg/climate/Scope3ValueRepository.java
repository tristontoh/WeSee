package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Scope3ValueRepository extends JpaRepository<Scope3Value, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — editing one
     * year's figure would otherwise move it within the category's series. There is one row per
     * fiscal year (unique per category), so the year is a total order on its own.
     */
    List<Scope3Value> findByCategoryIdOrderByFiscalYearAsc(UUID categoryId);
    List<Scope3Value> findByCompanyId(UUID companyId);
    Optional<Scope3Value> findByCategoryIdAndFiscalYear(UUID categoryId, Integer fiscalYear);
    void deleteByCategoryId(UUID categoryId);
}
