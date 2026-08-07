package com.wesee.esg.assurance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SignOffRecordRepository extends JpaRepository<SignOffRecord, UUID> {
    List<SignOffRecord> findByCompanyId(UUID companyId);
    Optional<SignOffRecord> findByCompanyIdAndFiscalYear(UUID companyId, Integer fiscalYear);
}
