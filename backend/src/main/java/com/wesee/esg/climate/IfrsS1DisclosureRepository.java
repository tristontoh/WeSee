package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface IfrsS1DisclosureRepository extends JpaRepository<IfrsS1Disclosure, UUID> {
    Optional<IfrsS1Disclosure> findByCompanyId(UUID companyId);
}
