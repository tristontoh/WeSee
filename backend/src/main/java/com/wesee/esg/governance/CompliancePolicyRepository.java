package com.wesee.esg.governance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompliancePolicyRepository extends JpaRepository<CompliancePolicy, UUID> {
    List<CompliancePolicy> findByCompanyId(UUID companyId);

    Optional<CompliancePolicy> findByIdAndCompanyId(UUID id, UUID companyId);

    Optional<CompliancePolicy> findByCompanyIdAndPolicyKey(UUID companyId, String policyKey);
}
