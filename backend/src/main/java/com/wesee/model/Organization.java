package com.wesee.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organizations")
public class Organization {

    @Id
    private String id = UUID.randomUUID().toString();

    private String name;

    @Enumerated(EnumType.STRING)
    private OrgType orgType;

    // BYO-Token: encrypted LLM key + provider/model (nullable until configured).
    private String llmProvider;
    private String llmModel;
    @Column(columnDefinition = "text")
    private String llmTokenEncrypted;
    private String llmTokenFingerprint;

    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public OrgType getOrgType() { return orgType; }
    public void setOrgType(OrgType orgType) { this.orgType = orgType; }
    public String getLlmProvider() { return llmProvider; }
    public void setLlmProvider(String v) { this.llmProvider = v; }
    public String getLlmModel() { return llmModel; }
    public void setLlmModel(String v) { this.llmModel = v; }
    public String getLlmTokenEncrypted() { return llmTokenEncrypted; }
    public void setLlmTokenEncrypted(String v) { this.llmTokenEncrypted = v; }
    public String getLlmTokenFingerprint() { return llmTokenFingerprint; }
    public void setLlmTokenFingerprint(String v) { this.llmTokenFingerprint = v; }
    public Instant getCreatedAt() { return createdAt; }
}
