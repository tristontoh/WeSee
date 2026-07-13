package com.wesee.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** A certified Scope 1/2/3 metric produced by Engine 01, with full audit provenance. */
@Entity
@Table(name = "emission_records")
public class EmissionRecord {

    @Id
    private String id = UUID.randomUUID().toString();

    private String orgId;
    private int scope;                    // 1, 2 or 3
    private String activityType;          // grid_electricity / diesel / transport
    private double activityValue;         // e.g. kWh, litres, tonne-km
    private String activityUnit;
    private double tco2e;                 // computed result
    private String factorKey;             // which factor was applied
    private double factorValue;
    @Column(columnDefinition = "text")
    private String factorSource;          // citation for auditors
    private String factorDatasetVersion;
    private double confidence = 1.0;
    private String ledgerTxId;            // tamper-evident ledger commit
    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public String getOrgId() { return orgId; }
    public void setOrgId(String orgId) { this.orgId = orgId; }
    public int getScope() { return scope; }
    public void setScope(int scope) { this.scope = scope; }
    public String getActivityType() { return activityType; }
    public void setActivityType(String v) { this.activityType = v; }
    public double getActivityValue() { return activityValue; }
    public void setActivityValue(double v) { this.activityValue = v; }
    public String getActivityUnit() { return activityUnit; }
    public void setActivityUnit(String v) { this.activityUnit = v; }
    public double getTco2e() { return tco2e; }
    public void setTco2e(double v) { this.tco2e = v; }
    public String getFactorKey() { return factorKey; }
    public void setFactorKey(String v) { this.factorKey = v; }
    public double getFactorValue() { return factorValue; }
    public void setFactorValue(double v) { this.factorValue = v; }
    public String getFactorSource() { return factorSource; }
    public void setFactorSource(String v) { this.factorSource = v; }
    public String getFactorDatasetVersion() { return factorDatasetVersion; }
    public void setFactorDatasetVersion(String v) { this.factorDatasetVersion = v; }
    public double getConfidence() { return confidence; }
    public void setConfidence(double v) { this.confidence = v; }
    public String getLedgerTxId() { return ledgerTxId; }
    public void setLedgerTxId(String v) { this.ledgerTxId = v; }
    public Instant getCreatedAt() { return createdAt; }
}
