package com.wesee.esg.materiality;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StakeholderOptionRepository extends JpaRepository<StakeholderOption, UUID> {
    List<StakeholderOption> findByCompanyId(UUID companyId);
    boolean existsByCompanyId(UUID companyId);
}
