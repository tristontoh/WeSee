package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Scope3CategoryRepository extends JpaRepository<Scope3Category, UUID> {
    List<Scope3Category> findByCompanyId(UUID companyId);
    Optional<Scope3Category> findByIdAndCompanyId(UUID id, UUID companyId);
    boolean existsByCompanyId(UUID companyId);
}
