package com.wesee.esg.governance;

import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.governance.dto.CompliancePolicyResponse;
import com.wesee.esg.governance.dto.CreateCompliancePolicyRequest;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CompliancePolicyService {

    /** Bursa/MACC-mandated policies every listed issuer must maintain — seeded once per company
     *  and protected from deletion (see {@link #deletePolicy}). Companies can add further custom
     *  policies beyond these via {@link #createPolicy}, scoped to whatever's material to them. */
    private static final Map<String, Object[]> DEFAULT_POLICIES = Map.of(
            "ANTI_CORRUPTION", new Object[]{
                    "Anti-Corruption Policy (Section 17A MACC Act)",
                    "Section 17A of the Malaysian Anti-Corruption Commission Act 2009 requires listed issuers to establish and maintain adequate anti-corruption procedures, reviewed at least once every 3 years and published on the company website.",
                    36
            },
            "WHISTLEBLOWING", new Object[]{
                    "Whistleblowing Policy & Procedures",
                    "Bursa Malaysia Listing Requirements mandate whistle-blowing policies and procedures be established, maintained, periodically reviewed (at least every 3 years), and published on the company website.",
                    36
            },
            "BOARD_GENDER_DIVERSITY", new Object[]{
                    "Board Gender Diversity Policy (≥30% women directors)",
                    "Bursa Malaysia requires listed issuer boards to have at least 30% women directors, with the board's gender diversity policy disclosed in the annual report.",
                    12
            }
    );

    private final CompliancePolicyRepository repository;
    private final CurrentUserProvider currentUserProvider;

    public CompliancePolicyService(CompliancePolicyRepository repository, CurrentUserProvider currentUserProvider) {
        this.repository = repository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public List<CompliancePolicyResponse> getPolicies() {
        UUID companyId = currentUserProvider.requireCompanyId();
        List<CompliancePolicy> policies = repository.findByCompanyIdOrdered(companyId);
        if (policies.isEmpty()) {
            for (var entry : DEFAULT_POLICIES.entrySet()) {
                CompliancePolicy policy = new CompliancePolicy();
                policy.setCompanyId(companyId);
                policy.setPolicyKey(entry.getKey());
                policy.setName((String) entry.getValue()[0]);
                policy.setDescription((String) entry.getValue()[1]);
                policy.setReviewCycleMonths((Integer) entry.getValue()[2]);
                repository.save(policy);
            }
            policies = repository.findByCompanyIdOrdered(companyId);
        }
        return policies.stream().map(CompliancePolicyResponse::from).toList();
    }

    @Transactional
    public CompliancePolicyResponse createPolicy(CreateCompliancePolicyRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        CompliancePolicy policy = new CompliancePolicy();
        policy.setCompanyId(companyId);
        policy.setPolicyKey(null);
        policy.setName(request.name());
        policy.setDescription(request.description());
        policy.setReviewCycleMonths(request.reviewCycleMonths());
        return CompliancePolicyResponse.from(repository.save(policy));
    }

    @Transactional
    public void deletePolicy(UUID id) {
        UUID companyId = currentUserProvider.requireCompanyId();
        CompliancePolicy policy = repository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new NotFoundException("Compliance policy not found"));
        if (policy.getPolicyKey() != null) {
            throw new ConflictException("This policy is a Bursa/MACC-mandated default and cannot be removed");
        }
        repository.delete(policy);
    }

    @Transactional
    public CompliancePolicyResponse markReviewed(UUID id, String documentUrl) {
        UUID companyId = currentUserProvider.requireCompanyId();
        CompliancePolicy policy = repository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new NotFoundException("Compliance policy not found"));
        policy.setLastReviewedAt(Instant.now());
        if (documentUrl != null && !documentUrl.isBlank()) {
            policy.setDocumentUrl(documentUrl);
        }
        return CompliancePolicyResponse.from(repository.save(policy));
    }
}
