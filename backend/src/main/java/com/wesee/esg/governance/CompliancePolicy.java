package com.wesee.esg.governance;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Policies are no longer capped at the 3 Bursa/MACC-mandated defaults (anti-corruption,
 *  whistleblowing, board gender diversity) — companies can add their own beyond those, scoped to
 *  whatever's material to them. {@code policyKey} is now just an optional tag identifying one of
 *  the seeded defaults (null for a company-added custom policy); see
 *  {@link CompliancePolicyService#DEFAULT_POLICIES}. */
@Entity
@Table(name = "compliance_policy")
@Getter
@Setter
@NoArgsConstructor
public class CompliancePolicy extends TenantOwnedEntity {

    @Column(name = "policy_key", length = 30)
    private String policyKey;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "review_cycle_months", nullable = false)
    private Integer reviewCycleMonths;

    @Column(name = "last_reviewed_at")
    private Instant lastReviewedAt;

    @Column(name = "document_url", length = 500)
    private String documentUrl;
}
