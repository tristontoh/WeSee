package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmissionActivityEntryRepository extends JpaRepository<EmissionActivityEntry, UUID> {
    List<EmissionActivityEntry> findByCompanyIdAndFiscalYear(UUID companyId, int fiscalYear);

    Optional<EmissionActivityEntry> findByIdAndCompanyId(UUID id, UUID companyId);
}
