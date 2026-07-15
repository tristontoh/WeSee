package com.wesee.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** B2B exchange edge: a Compliance Hub buyer ↔ Workspace supplier relationship + assurance state. */
@Entity
@Table(name = "supplier_links")
public class SupplierLink {

    @Id
    private String id = UUID.randomUUID().toString();

    private String buyerOrgId;
    private String supplierOrgId;   // null = non-adopting supplier (disconnected flow)
    private String supplierName;

    @Enumerated(EnumType.STRING)
    private AssuranceTier tier;

    private int integrityPct;
    private boolean shared;
    private Instant createdAt = Instant.now();

    public SupplierLink() {}

    public SupplierLink(String buyerOrgId, String supplierOrgId, String supplierName,
                        AssuranceTier tier, int integrityPct, boolean shared) {
        this.buyerOrgId = buyerOrgId;
        this.supplierOrgId = supplierOrgId;
        this.supplierName = supplierName;
        this.tier = tier;
        this.integrityPct = integrityPct;
        this.shared = shared;
    }

    public String getId() { return id; }
    public String getBuyerOrgId() { return buyerOrgId; }
    public String getSupplierOrgId() { return supplierOrgId; }
    public String getSupplierName() { return supplierName; }
    public AssuranceTier getTier() { return tier; }
    public int getIntegrityPct() { return integrityPct; }
    public boolean isShared() { return shared; }
}
