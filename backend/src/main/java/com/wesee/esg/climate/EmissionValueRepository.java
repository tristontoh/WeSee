package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmissionValueRepository extends JpaRepository<EmissionValue, UUID> {
    List<EmissionValue> findByCompanyIdAndScope(UUID companyId, EmissionScope scope);
    Optional<EmissionValue> findByCompanyIdAndScopeAndFiscalYear(UUID companyId, EmissionScope scope, Integer fiscalYear);
}
