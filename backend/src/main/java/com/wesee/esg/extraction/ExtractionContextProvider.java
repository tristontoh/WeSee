package com.wesee.esg.extraction;

import com.wesee.esg.climate.EmissionFactorRepository;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.reference.IndicatorDefinitionRepository;
import com.wesee.esg.reference.MatterSetResolverService;
import com.wesee.esg.reference.SustainabilityMatter;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.List;
import java.util.UUID;

/**
 * Builds the closed set of factors and indicators a tenant's proposals must resolve against.
 *
 * <p>Its own bean rather than a method on ExtractionService: the service starts the worker and the
 * worker needs this, so putting it on the service would make the two depend on each other and
 * Spring would refuse to start.
 */
@Component
public class ExtractionContextProvider {

    private final EmissionFactorRepository factorRepository;
    private final IndicatorDefinitionRepository indicatorDefinitionRepository;
    private final MatterSetResolverService matterSetResolverService;
    private final CompanyRepository companyRepository;

    public ExtractionContextProvider(EmissionFactorRepository factorRepository,
                                      IndicatorDefinitionRepository indicatorDefinitionRepository,
                                      MatterSetResolverService matterSetResolverService,
                                      CompanyRepository companyRepository) {
        this.factorRepository = factorRepository;
        this.indicatorDefinitionRepository = indicatorDefinitionRepository;
        this.matterSetResolverService = matterSetResolverService;
        this.companyRepository = companyRepository;
    }

    @Transactional(readOnly = true)
    public ExtractionContext contextFor(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));

        List<ExtractionContext.FactorOption> factors = factorRepository.findAllByOrderByScopeAscNameAsc().stream()
                .map(f -> new ExtractionContext.FactorOption(f.getId(), f.getName(), f.getActivityUnit()))
                .toList();

        List<String> matterIds = matterSetResolverService.resolveApplicableMatters(company).stream()
                .map(SustainabilityMatter::getId)
                .toList();
        List<ExtractionContext.IndicatorOption> indicators =
                indicatorDefinitionRepository.findByMatterIdInOrderByCategoryAscNameAsc(matterIds).stream()
                        .map(d -> new ExtractionContext.IndicatorOption(d.getId(), d.getName(), d.getUnit()))
                        .toList();

        return new ExtractionContext(factors, indicators, Year.now().getValue());
    }
}
