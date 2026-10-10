/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import com.wesee.esg.assurance.SignOffLock;
import com.wesee.esg.climate.dto.CreateScope3CategoryRequest;
import com.wesee.esg.climate.dto.EmissionPointDto;
import com.wesee.esg.climate.dto.EmissionsResponse;
import com.wesee.esg.climate.dto.Scope3CategoryResponse;
import com.wesee.esg.climate.dto.Scope3ValuePointDto;
import com.wesee.esg.climate.dto.SetEmissionValueRequest;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.reference.TransitionReliefRuleRepository;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Year;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class EmissionsService {

    /** The GHG Protocol Corporate Value Chain (Scope 3) Standard's 15 categories, in order.
     *  Category 15 (Investments / financed emissions) is mandatory for financial institutions —
     *  see {@link #isMandatory}. */
    private record StandardCategory(int number, String name, String tooltip) {
    }

    private static final List<StandardCategory> STANDARD_SCOPE3_CATEGORIES = List.of(
            new StandardCategory(1, "Purchased Goods and Services", "Cradle-to-gate emissions of all goods and services purchased or acquired."),
            new StandardCategory(2, "Capital Goods", "Cradle-to-gate emissions of capital goods purchased or acquired."),
            new StandardCategory(3, "Fuel- and Energy-Related Activities", "Emissions related to fuel and energy purchased and consumed, not already counted in Scope 1 or 2."),
            new StandardCategory(4, "Upstream Transportation and Distribution", "Transportation and distribution of purchased products between a company's suppliers and its own operations."),
            new StandardCategory(5, "Waste Generated in Operations", "Disposal and treatment of waste generated in the company's own operations."),
            new StandardCategory(6, "Business Travel", "Transportation of employees for business-related activities in vehicles not owned by the company."),
            new StandardCategory(7, "Employee Commuting", "Transportation of employees between their homes and worksites."),
            new StandardCategory(8, "Upstream Leased Assets", "Operation of assets leased by the company (lessee) not already included in Scope 1 or 2."),
            new StandardCategory(9, "Downstream Transportation and Distribution", "Transportation and distribution of sold products between the company's operations and the end consumer."),
            new StandardCategory(10, "Processing of Sold Products", "Processing of intermediate products sold by downstream companies."),
            new StandardCategory(11, "Use of Sold Products", "End-use of goods and services sold by the company."),
            new StandardCategory(12, "End-of-Life Treatment of Sold Products", "Waste disposal and treatment of products sold by the company at the end of their life."),
            new StandardCategory(13, "Downstream Leased Assets", "Operation of assets owned by the company and leased to other entities (lessor), not already included in Scope 1 or 2."),
            new StandardCategory(14, "Franchises", "Operation of franchises not already included in Scope 1 or 2."),
            new StandardCategory(15, "Investments", "Operation of investments (including equity and debt investments and project finance), reported by asset managers, banks, and insurers as financed emissions.")
    );

    private final EmissionValueRepository emissionValueRepository;
    private final EmissionActivityEntryRepository activityEntryRepository;
    private final Scope3CategoryRepository scope3CategoryRepository;
    private final Scope3ValueRepository scope3ValueRepository;
    private final TransitionReliefRuleRepository transitionReliefRuleRepository;
    private final CurrentUserProvider currentUserProvider;
    private final CompanyRepository companyRepository;
    private final SignOffLock signOffLock;

    public EmissionsService(EmissionValueRepository emissionValueRepository,
                             EmissionActivityEntryRepository activityEntryRepository,
                             Scope3CategoryRepository scope3CategoryRepository,
                             Scope3ValueRepository scope3ValueRepository,
                             TransitionReliefRuleRepository transitionReliefRuleRepository,
                             CurrentUserProvider currentUserProvider,
                             CompanyRepository companyRepository,
                            SignOffLock signOffLock) {
        this.signOffLock = signOffLock;
        this.emissionValueRepository = emissionValueRepository;
        this.activityEntryRepository = activityEntryRepository;
        this.scope3CategoryRepository = scope3CategoryRepository;
        this.scope3ValueRepository = scope3ValueRepository;
        this.transitionReliefRuleRepository = transitionReliefRuleRepository;
        this.currentUserProvider = currentUserProvider;
        this.companyRepository = companyRepository;
    }

    @Transactional
    public EmissionsResponse getEmissions() {
        UUID companyId = currentUserProvider.requireCompanyId();
        Company company = companyRepository.findById(companyId).orElseThrow(() -> new NotFoundException("Company not found"));

        List<EmissionPointDto> scope1 = scopeSeries(companyId, EmissionScope.SCOPE_1);
        List<EmissionPointDto> scope2 = scopeSeries(companyId, EmissionScope.SCOPE_2);

        if (!scope3CategoryRepository.existsByCompanyId(companyId)) {
            seedStandardScope3Categories(companyId);
        }
        List<Scope3Category> categories = scope3CategoryRepository.findByCompanyIdOrderByCreatedAtAscIdAsc(companyId);
        int reliefYears = transitionReliefRuleRepository.findById(company.getMarketClassification())
                .map(r -> r.getReliefYears()).orElse(0);
        Integer firstReportingYear = scope3ValueRepository.findByCompanyId(companyId).stream()
                .map(Scope3Value::getFiscalYear)
                .min(Integer::compareTo)
                .orElse(Year.now().getValue());

        boolean isFinancialInstitution = company.getSector() != null && "FINANCIAL_SERVICES".equals(company.getSector().getCode());

        // Scope 3 activity, summed per category and year. Until this existed an entry recorded
        // against a Scope 3 factor — business travel, freight — was stored, listed on the Activity
        // screen, and counted in no reported figure at all, because the entry could not say which
        // of the fifteen categories it belonged to.
        Map<UUID, Map<Integer, BigDecimal>> activityByCategory = new HashMap<>();
        for (Object[] row : activityEntryRepository.sumScope3TcoByCategoryAndYear(companyId)) {
            activityByCategory
                    .computeIfAbsent((UUID) row[0], k -> new HashMap<>())
                    .put((Integer) row[1], (BigDecimal) row[2]);
        }

        List<Scope3CategoryResponse> scope3 = categories.stream()
                .sorted(Comparator.comparing(
                        cat -> cat.getStandardCategoryNumber() != null ? cat.getStandardCategoryNumber() : Integer.MAX_VALUE))
                .map(cat -> {
                    Map<Integer, BigDecimal> entered = new HashMap<>();
                    scope3ValueRepository.findByCategoryIdOrderByFiscalYearAsc(cat.getId())
                            .forEach(v -> entered.put(v.getFiscalYear(), v.getValue()));
                    Map<Integer, BigDecimal> fromActivity =
                            activityByCategory.getOrDefault(cat.getId(), Map.of());

                    // Entered wins over computed, exactly as scopeSeries does for scopes 1 and 2.
                    List<Scope3ValuePointDto> values = Stream
                            .concat(entered.keySet().stream(), fromActivity.keySet().stream())
                            .distinct()
                            .sorted()
                            .map(year -> new Scope3ValuePointDto(
                                    year,
                                    entered.containsKey(year) ? entered.get(year) : fromActivity.get(year),
                                    EmissionMath.isInRelief(year, firstReportingYear, reliefYears)))
                            .toList();
                    boolean mandatory = isMandatory(cat, isFinancialInstitution);
                    return new Scope3CategoryResponse(cat.getId(), cat.getName(), cat.getTooltip(), cat.getStandardCategoryNumber(), mandatory, values);
                })
                .toList();

        return new EmissionsResponse(scope1, scope2, scope3);
    }

    private boolean isMandatory(Scope3Category category, boolean isFinancialInstitution) {
        return isFinancialInstitution && Integer.valueOf(15).equals(category.getStandardCategoryNumber());
    }

    /**
     * The company's row for one standard GHG Protocol category, seeding the standard set first if
     * this company has never had them.
     *
     * <p>Categories are created lazily — a company that has not opened the Emissions screen has
     * none — so anything that writes a Scope 3 figure has to be able to bring them into existence
     * rather than refusing. Supply-chain allocation is the other caller.
     */
    @Transactional
    public Scope3Category requireStandardCategory(UUID companyId, int standardCategoryNumber) {
        List<Scope3Category> existing = scope3CategoryRepository.findByCompanyIdOrderByCreatedAtAscIdAsc(companyId);
        if (existing.isEmpty()) {
            seedStandardScope3Categories(companyId);
            existing = scope3CategoryRepository.findByCompanyIdOrderByCreatedAtAscIdAsc(companyId);
        }
        return existing.stream()
                .filter(c -> Integer.valueOf(standardCategoryNumber).equals(c.getStandardCategoryNumber()))
                .findFirst()
                .orElseThrow(() -> new NotFoundException(
                        "This company has no Scope 3 Category " + standardCategoryNumber));
    }

    private void seedStandardScope3Categories(UUID companyId) {
        for (StandardCategory std : STANDARD_SCOPE3_CATEGORIES) {
            Scope3Category category = new Scope3Category();
            category.setCompanyId(companyId);
            category.setName("Category " + std.number() + ": " + std.name());
            category.setTooltip(std.tooltip());
            category.setStandardCategoryNumber(std.number());
            scope3CategoryRepository.save(category);
        }
    }

    /**
     * One scope's figures per year, from the two places they can come from.
     *
     * A figure entered by hand wins for the year it covers — accepting a bill must never quietly
     * rewrite a number somebody put their name to. A year with no entered figure falls back to the
     * total of that scope's accepted activity entries, which is what connects an accepted bill to
     * the reports: before this, activity entries were read by nothing but their own screen, so a
     * workspace that only ever uploaded documents reported no emissions at all.
     *
     * Where both exist the derived total is not lost — it is on the Emission Activity screen, and
     * the difference between the two is exactly what a reviewer should be looking at.
     *
     * <p>This method reads the two sources; {@link EmissionMath#mergeSeries} decides between them.
     */
    private List<EmissionPointDto> scopeSeries(UUID companyId, EmissionScope scope) {
        Map<Integer, BigDecimal> entered = new HashMap<>();
        for (EmissionValue v : emissionValueRepository.findByCompanyIdAndScopeOrderByFiscalYearAsc(companyId, scope)) {
            entered.put(v.getFiscalYear(), v.getValue());
        }

        Map<Integer, BigDecimal> derived = new HashMap<>();
        for (Object[] row : activityEntryRepository.sumTco2eByFiscalYear(companyId, scope)) {
            derived.put((Integer) row[0], (BigDecimal) row[1]);
        }

        return EmissionMath.mergeSeries(entered, derived);
    }

    @Transactional
    public EmissionsResponse setScopeValue(EmissionScope scope, int fiscalYear, SetEmissionValueRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        signOffLock.requireYearOpen(companyId, fiscalYear, "changing this scope total");
        EmissionValue value = emissionValueRepository.findByCompanyIdAndScopeAndFiscalYear(companyId, scope, fiscalYear)
                .orElseGet(() -> {
                    EmissionValue v = new EmissionValue();
                    v.setCompanyId(companyId);
                    v.setScope(scope);
                    v.setFiscalYear(fiscalYear);
                    return v;
                });
        value.setValue(request.value());
        emissionValueRepository.save(value);
        return getEmissions();
    }

    @Transactional
    public Scope3CategoryResponse createScope3Category(CreateScope3CategoryRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Scope3Category category = new Scope3Category();
        category.setCompanyId(companyId);
        category.setName(request.name());
        category.setTooltip(request.tooltip());
        category = scope3CategoryRepository.save(category);
        return new Scope3CategoryResponse(category.getId(), category.getName(), category.getTooltip(), null, false, List.of());
    }

    @Transactional
    public EmissionsResponse setScope3Value(UUID categoryId, int fiscalYear, SetEmissionValueRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        signOffLock.requireYearOpen(companyId, fiscalYear, "changing this category total");
        Scope3Category category = scope3CategoryRepository.findByIdAndCompanyId(categoryId, companyId)
                .orElseThrow(() -> new NotFoundException("Scope 3 category not found"));

        Scope3Value value = scope3ValueRepository.findByCategoryIdAndFiscalYear(categoryId, fiscalYear)
                .orElseGet(() -> {
                    Scope3Value v = new Scope3Value();
                    v.setCompanyId(companyId);
                    v.setCategory(category);
                    v.setFiscalYear(fiscalYear);
                    return v;
                });
        value.setValue(request.value());
        scope3ValueRepository.save(value);
        return getEmissions();
    }

    @Transactional
    public void deleteScope3Category(UUID categoryId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Company company = companyRepository.findById(companyId).orElseThrow(() -> new NotFoundException("Company not found"));
        Scope3Category category = scope3CategoryRepository.findByIdAndCompanyId(categoryId, companyId)
                .orElseThrow(() -> new NotFoundException("Scope 3 category not found"));

        // Deleting a category removes its figure from every year at once, so the lock has to be
        // checked against all of them rather than against one.
        Set<Integer> locked = signOffLock.lockedYears(companyId);
        scope3ValueRepository.findByCategoryIdOrderByFiscalYearAsc(categoryId).stream()
                .map(Scope3Value::getFiscalYear)
                .filter(locked::contains)
                .findFirst()
                .ifPresent(year -> {
                    throw new ConflictException("FY" + year + " has been signed off and reports a"
                            + " figure in this category — deleting it would put that year's"
                            + " assurance hash over figures nobody signed. Revoke the sign-off first.");
                });

        boolean isFinancialInstitution = company.getSector() != null && "FINANCIAL_SERVICES".equals(company.getSector().getCode());
        if (isMandatory(category, isFinancialInstitution)) {
            throw new ConflictException("Category 15 (Investments/financed emissions) is mandatory for financial institutions under IFRS S2 and cannot be removed");
        }

        scope3ValueRepository.deleteByCategoryId(category.getId());
        scope3CategoryRepository.delete(category);
    }
}
