package com.wesee.repo;

import com.wesee.model.EmissionRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmissionRecordRepository extends JpaRepository<EmissionRecord, String> {
    List<EmissionRecord> findByOrgId(String orgId);
}
