package com.wesee.esg.tenant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the list
     * visibly reshuffles after a save. {@code id} breaks ties, since rows seeded in one
     * transaction can share a timestamp. Renaming a subsidiary or changing its plan must not
     * move it in the group list.
     */
    List<Company> findByParentCompanyIdOrderByCreatedAtAscIdAsc(UUID parentCompanyId);

    /** The platform admin's all-tenants list. Ordered for the same reason, and to match it. */
    List<Company> findAllByOrderByCreatedAtAscIdAsc();
}
