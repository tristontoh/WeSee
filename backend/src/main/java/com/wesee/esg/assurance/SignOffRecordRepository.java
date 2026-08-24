package com.wesee.esg.assurance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SignOffRecordRepository extends JpaRepository<SignOffRecord, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the list
     * visibly reshuffles after a save. There is one record per fiscal year (unique), so the
     * year is a total order on its own — signing or revoking a year leaves the list alone.
     */
    List<SignOffRecord> findByCompanyIdOrderByFiscalYearDesc(UUID companyId);
    Optional<SignOffRecord> findByCompanyIdAndFiscalYear(UUID companyId, Integer fiscalYear);
}
