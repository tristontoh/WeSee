package com.wesee.esg.common;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.util.UUID;

/**
 * Mapped superclass for every entity scoped to a single company (tenant).
 * The {@code companyFilter} Hibernate filter is the data-access-layer safety net for tenant
 * isolation (SRS NFR: "enforced at the data-access layer, not only the UI layer") — it is enabled
 * per-request from the authenticated principal's companyId, in addition to explicit companyId
 * checks in service methods.
 */
@MappedSuperclass
@FilterDef(name = "companyFilter", parameters = @ParamDef(name = "companyId", type = UUID.class))
@Filter(name = "companyFilter", condition = "company_id = :companyId")
public abstract class TenantOwnedEntity extends BaseEntity {

    @Column(name = "company_id", nullable = false, updatable = false)
    private UUID companyId;

    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }
}
