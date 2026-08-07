package com.wesee.esg.tenant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {
    List<Company> findByParentCompanyId(UUID parentCompanyId);
}
