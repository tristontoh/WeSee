package com.wesee.esg.governance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MatterOwnershipRepository extends JpaRepository<MatterOwnership, UUID> {
    List<MatterOwnership> findByCompanyId(UUID companyId);
    Optional<MatterOwnership> findByCompanyIdAndMatterId(UUID companyId, String matterId);
}
