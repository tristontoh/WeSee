package com.wesee.esg.email;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CompanyEmailSettingsRepository extends JpaRepository<CompanyEmailSettings, UUID> {
    Optional<CompanyEmailSettings> findByCompanyId(UUID companyId);
}
