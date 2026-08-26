package com.wesee.esg.permission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomRoleRepository extends JpaRepository<CustomRole, UUID> {
    List<CustomRole> findByCompanyIdOrderByNameAsc(UUID companyId);

    Optional<CustomRole> findByCompanyIdAndNameIgnoreCase(UUID companyId, String name);
}
