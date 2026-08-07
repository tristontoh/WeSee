package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Scope3ValueRepository extends JpaRepository<Scope3Value, UUID> {
    List<Scope3Value> findByCategoryId(UUID categoryId);
    List<Scope3Value> findByCompanyId(UUID companyId);
    Optional<Scope3Value> findByCategoryIdAndFiscalYear(UUID categoryId, Integer fiscalYear);
    void deleteByCategoryId(UUID categoryId);
}
