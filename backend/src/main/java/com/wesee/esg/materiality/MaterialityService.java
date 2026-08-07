package com.wesee.esg.materiality;

import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.ForbiddenException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.materiality.dto.AddStakeholderRequest;
import com.wesee.esg.materiality.dto.AssessmentDetailResponse;
import com.wesee.esg.materiality.dto.AssessmentSummaryResponse;
import com.wesee.esg.materiality.dto.CreateAssessmentRequest;
import com.wesee.esg.materiality.dto.ScoreInput;
import com.wesee.esg.materiality.dto.ScoreResponse;
import com.wesee.esg.materiality.dto.StakeholderOptionResponse;
import com.wesee.esg.materiality.dto.ToggleStakeholderRequest;
import com.wesee.esg.reference.SustainabilityMatter;
import com.wesee.esg.reference.SustainabilityMatterRepository;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class MaterialityService {

    private static final List<String> DEFAULT_STAKEHOLDERS = List.of(
            "Employees", "Customers", "Investors & Shareholders", "Regulators & Government",
            "Local Communities", "Suppliers & Contractors", "Banks & Financiers"
    );
    private static final List<Boolean> DEFAULT_SELECTED = List.of(true, true, true, true, false, false, false);

    private final MaterialityAssessmentRepository assessmentRepository;
    private final MaterialityScoreRepository scoreRepository;
    private final MaterialityStakeholderSnapshotRepository stakeholderSnapshotRepository;
    private final StakeholderOptionRepository stakeholderOptionRepository;
    private final SustainabilityMatterRepository matterRepository;
    private final CurrentUserProvider currentUserProvider;
    private final CompanyRepository companyRepository;
    private final AppUserRepository appUserRepository;

    public MaterialityService(MaterialityAssessmentRepository assessmentRepository,
                               MaterialityScoreRepository scoreRepository,
                               MaterialityStakeholderSnapshotRepository stakeholderSnapshotRepository,
                               StakeholderOptionRepository stakeholderOptionRepository,
                               SustainabilityMatterRepository matterRepository,
                               CurrentUserProvider currentUserProvider,
                               CompanyRepository companyRepository,
                               AppUserRepository appUserRepository) {
        this.assessmentRepository = assessmentRepository;
        this.scoreRepository = scoreRepository;
        this.stakeholderSnapshotRepository = stakeholderSnapshotRepository;
        this.stakeholderOptionRepository = stakeholderOptionRepository;
        this.matterRepository = matterRepository;
        this.currentUserProvider = currentUserProvider;
        this.companyRepository = companyRepository;
        this.appUserRepository = appUserRepository;
    }

    @Transactional
    public List<StakeholderOptionResponse> listStakeholderOptions() {
        UUID companyId = currentUserProvider.requireCompanyId();
        if (!stakeholderOptionRepository.existsByCompanyId(companyId)) {
            for (int i = 0; i < DEFAULT_STAKEHOLDERS.size(); i++) {
                StakeholderOption option = new StakeholderOption();
                option.setCompanyId(companyId);
                option.setName(DEFAULT_STAKEHOLDERS.get(i));
                option.setSelected(DEFAULT_SELECTED.get(i));
                option.setCustom(false);
                stakeholderOptionRepository.save(option);
            }
        }
        return stakeholderOptionRepository.findByCompanyId(companyId).stream()
                .map(StakeholderOptionResponse::from)
                .toList();
    }

    @Transactional
    public StakeholderOptionResponse addStakeholder(AddStakeholderRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        StakeholderOption option = new StakeholderOption();
        option.setCompanyId(companyId);
        option.setName(request.name());
        option.setSelected(true);
        option.setCustom(true);
        return StakeholderOptionResponse.from(stakeholderOptionRepository.save(option));
    }

    @Transactional
    public StakeholderOptionResponse toggleStakeholder(UUID id, ToggleStakeholderRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        StakeholderOption option = stakeholderOptionRepository.findById(id)
                .filter(o -> o.getCompanyId().equals(companyId))
                .orElseThrow(() -> new NotFoundException("Stakeholder option not found"));
        option.setSelected(request.selected());
        return StakeholderOptionResponse.from(stakeholderOptionRepository.save(option));
    }

    @Transactional
    public void deleteStakeholder(UUID id) {
        UUID companyId = currentUserProvider.requireCompanyId();
        StakeholderOption option = stakeholderOptionRepository.findById(id)
                .filter(o -> o.getCompanyId().equals(companyId))
                .orElseThrow(() -> new NotFoundException("Stakeholder option not found"));
        if (!Boolean.TRUE.equals(option.getCustom())) {
            throw new ForbiddenException("Only custom stakeholder options can be deleted");
        }
        stakeholderOptionRepository.delete(option);
    }

    @Transactional(readOnly = true)
    public List<AssessmentSummaryResponse> listAssessments() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return assessmentRepository.findByCompanyIdOrderByAssessmentDateDesc(companyId).stream()
                .map(AssessmentSummaryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssessmentDetailResponse getAssessment(UUID id) {
        UUID companyId = currentUserProvider.requireCompanyId();
        MaterialityAssessment assessment = assessmentRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new NotFoundException("Assessment not found"));
        return toDetail(assessment);
    }

    @Transactional
    public AssessmentDetailResponse createAssessment(CreateAssessmentRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Company company = companyRepository.findById(companyId).orElseThrow(() -> new NotFoundException("Company not found"));
        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        MaterialityAssessment assessment = new MaterialityAssessment();
        assessment.setCompanyId(companyId);
        assessment.setName(request.name());
        assessment.setAssessmentDate(request.assessmentDate());
        assessment.setPlanAtCapture(company.getSubscriptionPlan());
        assessment.setMarketAtCapture(company.getMarketClassification());
        assessment.setCreatedByName(user.getName());
        assessment.setStatus(AssessmentStatus.DRAFT);
        assessment = assessmentRepository.save(assessment);

        List<String> stakeholderNames = request.stakeholderNames() != null && !request.stakeholderNames().isEmpty()
                ? request.stakeholderNames()
                : stakeholderOptionRepository.findByCompanyId(companyId).stream()
                        .filter(o -> Boolean.TRUE.equals(o.getSelected()))
                        .map(StakeholderOption::getName)
                        .toList();
        if (stakeholderNames.isEmpty()) {
            stakeholderNames = List.of("Not Specified");
        }

        int order = 0;
        for (String name : stakeholderNames) {
            MaterialityStakeholderSnapshot snapshot = new MaterialityStakeholderSnapshot();
            snapshot.setCompanyId(companyId);
            snapshot.setAssessment(assessment);
            snapshot.setName(name);
            snapshot.setSortOrder(order++);
            stakeholderSnapshotRepository.save(snapshot);
        }

        for (ScoreInput input : request.scores()) {
            SustainabilityMatter matter = matterRepository.findById(input.matterId())
                    .orElseThrow(() -> new NotFoundException("Unknown matter id: " + input.matterId()));
            MaterialityScore score = new MaterialityScore();
            score.setCompanyId(companyId);
            score.setAssessment(assessment);
            score.setMatter(matter);
            score.setImpact(input.impact());
            score.setInfluence(input.influence());
            score.setRationale(input.rationale());
            scoreRepository.save(score);
        }

        return toDetail(assessment);
    }

    /** Bursa Malaysia's guide requires a separate board/management "Validate" step after Identify + Prioritise. */
    @Transactional
    public AssessmentDetailResponse validateAssessment(UUID id) {
        UUID companyId = currentUserProvider.requireCompanyId();
        MaterialityAssessment assessment = assessmentRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new NotFoundException("Assessment not found"));
        if (assessment.getStatus() == AssessmentStatus.VALIDATED) {
            throw new ConflictException("This assessment has already been validated");
        }

        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        assessment.setStatus(AssessmentStatus.VALIDATED);
        assessment.setValidatedByName(user.getName());
        assessment.setValidatedAt(Instant.now());
        assessmentRepository.save(assessment);

        return toDetail(assessment);
    }

    private AssessmentDetailResponse toDetail(MaterialityAssessment assessment) {
        List<String> stakeholders = stakeholderSnapshotRepository.findByAssessmentIdOrderBySortOrder(assessment.getId()).stream()
                .map(MaterialityStakeholderSnapshot::getName)
                .toList();
        List<ScoreResponse> scores = scoreRepository.findByAssessmentId(assessment.getId()).stream()
                .map(ScoreResponse::from)
                .toList();
        return new AssessmentDetailResponse(
                assessment.getId(), assessment.getName(), assessment.getAssessmentDate(),
                assessment.getPlanAtCapture(), assessment.getMarketAtCapture(), assessment.getCreatedByName(),
                assessment.getStatus(), assessment.getValidatedByName(), assessment.getValidatedAt(),
                stakeholders, scores
        );
    }
}
