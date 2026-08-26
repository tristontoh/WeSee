package com.wesee.esg.reference;

import com.wesee.esg.permission.PermissionRepository;
import com.wesee.esg.permission.dto.PermissionResponse;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.reference.dto.FeatureFlagResponse;
import com.wesee.esg.reference.dto.IndicatorDefinitionResponse;
import com.wesee.esg.reference.dto.IndicatorDefinitionUpsertRequest;
import com.wesee.esg.reference.dto.MatterResponse;
import com.wesee.esg.reference.dto.MatterUpsertRequest;
import com.wesee.esg.reference.dto.SectorResponse;
import com.wesee.esg.reference.dto.UpdateFeatureFlagRequest;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.tenant.PlanPricing;
import com.wesee.esg.tenant.PlanPricingRepository;
import com.wesee.esg.tenant.Sector;
import com.wesee.esg.tenant.SectorRepository;
import com.wesee.esg.tenant.dto.PlanPricingResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class ReferenceService {

    private final SustainabilityMatterRepository matterRepository;
    private final IndicatorDefinitionRepository indicatorDefinitionRepository;
    private final SectorRepository sectorRepository;
    private final MatterSetResolverService matterSetResolverService;
    private final CurrentUserProvider currentUserProvider;
    private final CompanyRepository companyRepository;
    private final FeatureFlagRepository featureFlagRepository;
    private final PlanPricingRepository planPricingRepository;
    private final PermissionRepository permissionRepository;

    public ReferenceService(SustainabilityMatterRepository matterRepository,
                             IndicatorDefinitionRepository indicatorDefinitionRepository,
                             SectorRepository sectorRepository,
                             MatterSetResolverService matterSetResolverService,
                             CurrentUserProvider currentUserProvider,
                             CompanyRepository companyRepository,
                             FeatureFlagRepository featureFlagRepository,
                             PlanPricingRepository planPricingRepository,
                             PermissionRepository permissionRepository) {
        this.matterRepository = matterRepository;
        this.indicatorDefinitionRepository = indicatorDefinitionRepository;
        this.sectorRepository = sectorRepository;
        this.matterSetResolverService = matterSetResolverService;
        this.currentUserProvider = currentUserProvider;
        this.companyRepository = companyRepository;
        this.featureFlagRepository = featureFlagRepository;
        this.planPricingRepository = planPricingRepository;
        this.permissionRepository = permissionRepository;
    }

    @Transactional(readOnly = true)
    public List<SectorResponse> listSectors() {
        return sectorRepository.findAllByOrderByNameAsc().stream().map(SectorResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MatterResponse> listMatters(MatterSet set) {
        List<SustainabilityMatter> matters = set != null
                ? matterRepository.findByMatterSetOrderByCategoryAscNameAsc(set)
                : matterRepository.findAllByOrderByCategoryAscNameAsc();
        return matters.stream().map(MatterResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MatterResponse> listApplicableMatters() {
        Company company = currentCompany();
        return matterSetResolverService.resolveApplicableMatters(company).stream()
                .map(MatterResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<IndicatorDefinitionResponse> listIndicators(String matterId) {
        List<IndicatorDefinition> defs = matterId != null
                ? indicatorDefinitionRepository.findByMatterIdInOrderByCategoryAscNameAsc(List.of(matterId))
                : indicatorDefinitionRepository.findAllByOrderByCategoryAscNameAsc();
        return defs.stream().map(IndicatorDefinitionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<IndicatorDefinitionResponse> listApplicableIndicators() {
        Company company = currentCompany();
        List<String> matterIds = matterSetResolverService.resolveApplicableMatters(company).stream()
                .map(SustainabilityMatter::getId)
                .toList();
        return indicatorDefinitionRepository.findByMatterIdInOrderByCategoryAscNameAsc(matterIds).stream()
                .map(IndicatorDefinitionResponse::from)
                .toList();
    }

    @Transactional
    public MatterResponse upsertMatter(MatterUpsertRequest request) {
        SustainabilityMatter matter = matterRepository.findById(request.id()).orElseGet(SustainabilityMatter::new);
        matter.setId(request.id());
        matter.setName(request.name());
        matter.setCategory(request.category());
        matter.setDescription(request.description());
        matter.setMatterSet(request.matterSet());
        return MatterResponse.from(matterRepository.save(matter));
    }

    @Transactional
    public void deleteMatter(String id) {
        if (!matterRepository.existsById(id)) {
            throw new NotFoundException("Matter not found: " + id);
        }
        matterRepository.deleteById(id);
    }

    @Transactional
    public IndicatorDefinitionResponse upsertIndicator(IndicatorDefinitionUpsertRequest request) {
        SustainabilityMatter matter = matterRepository.findById(request.matterId())
                .orElseThrow(() -> new NotFoundException("Unknown matter id: " + request.matterId()));

        IndicatorDefinition def = indicatorDefinitionRepository.findById(request.id()).orElseGet(IndicatorDefinition::new);
        def.setId(request.id());
        def.setName(request.name());
        def.setUnit(request.unit());
        def.setMatter(matter);
        def.setCategory(request.category());
        def.setSectorSpecific(request.sectorSpecific());
        def.setDefaultTarget(request.defaultTarget());
        def.setDefaultTargetDirection(request.defaultTargetDirection());
        def.setAggregationRule(request.aggregationRule());

        if (request.sectorCode() != null && !request.sectorCode().isBlank()) {
            Sector sector = sectorRepository.findById(request.sectorCode())
                    .orElseThrow(() -> new NotFoundException("Unknown sector code: " + request.sectorCode()));
            def.setSector(sector);
        } else {
            def.setSector(null);
        }

        return IndicatorDefinitionResponse.from(indicatorDefinitionRepository.save(def));
    }

    @Transactional
    public void deleteIndicator(String id) {
        if (!indicatorDefinitionRepository.existsById(id)) {
            throw new NotFoundException("Indicator not found: " + id);
        }
        indicatorDefinitionRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<FeatureFlagResponse> listFeatureFlags() {
        return featureFlagRepository.findAllByOrderByFeatureKeyAsc().stream().map(FeatureFlagResponse::from).toList();
    }

    /** Sorted on the enum, not the query — see PlanPricingService#listPricing for why. */
    @Transactional(readOnly = true)
    public List<PlanPricingResponse> listPlanPricing() {
        return planPricingRepository.findAll().stream()
                .sorted(Comparator.comparing(PlanPricing::getPlan))
                .map(PlanPricingResponse::from)
                .toList();
    }

    @Transactional
    public FeatureFlagResponse updateFeatureFlag(String featureKey, UpdateFeatureFlagRequest request) {
        FeatureFlag flag = featureFlagRepository.findById(featureKey)
                .orElseThrow(() -> new NotFoundException("Unknown feature key: " + featureKey));
        flag.setMinPlan(request.minPlan());
        flag.setVisibleOnlyAtMinPlan(request.visibleOnlyAtMinPlan());
        return FeatureFlagResponse.from(featureFlagRepository.save(flag));
    }

    private Company currentCompany() {
        return companyRepository.findById(currentUserProvider.requireCompanyId())
                .orElseThrow(() -> new NotFoundException("Company not found"));
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> listPermissions() {
        return permissionRepository.findAllByOrderByDisplayOrderAsc().stream().map(PermissionResponse::from).toList();
    }

}
