/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.export;

import com.wesee.esg.climate.EmissionsService;
import com.wesee.esg.climate.IfrsService;
import com.wesee.esg.climate.dto.BusinessSegmentResponse;
import com.wesee.esg.climate.dto.EmissionsResponse;
import com.wesee.esg.assurance.AssuranceService;
import com.wesee.esg.assurance.dto.SignOffResponse;
import com.wesee.esg.climate.dto.IfrsS1DisclosureResponse;
import com.wesee.esg.climate.dto.IfrsS2Response;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.export.dto.LogExportRequest;
import com.wesee.esg.governance.CompliancePolicyService;
import com.wesee.esg.governance.GovernanceService;
import com.wesee.esg.governance.dto.CompliancePolicyResponse;
import com.wesee.esg.governance.dto.GovernanceLevelResponse;
import com.wesee.esg.governance.dto.MatterOwnershipResponse;
import com.wesee.esg.indicators.IndicatorService;
import com.wesee.esg.indicators.dto.IndicatorResponse;
import com.wesee.esg.indicators.dto.IndicatorValuePointDto;
import com.wesee.esg.materiality.AssessmentStatus;
import com.wesee.esg.materiality.MaterialityService;
import com.wesee.esg.materiality.dto.AssessmentSummaryResponse;
import com.wesee.esg.materiality.dto.ScoreResponse;
import com.wesee.esg.pdf.PdfRenderer;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.tenant.SubscriptionPlan;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Renders the cross-module Integrated ESG Disclosure Report as a professional PDF via the {@code integrated-esg-report} Thymeleaf template. */
@Service
public class IntegratedReportService {

    private final CompanyRepository companyRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AppUserRepository appUserRepository;
    private final MaterialityService materialityService;
    private final GovernanceService governanceService;
    private final CompliancePolicyService compliancePolicyService;
    private final IndicatorService indicatorService;
    private final IfrsService ifrsService;
    private final EmissionsService emissionsService;
    private final AssuranceService assuranceService;
    private final ExportService exportService;
    private final PdfRenderer pdfRenderer;

    public IntegratedReportService(CompanyRepository companyRepository,
                                    CurrentUserProvider currentUserProvider,
                                    AppUserRepository appUserRepository,
                                    MaterialityService materialityService,
                                    GovernanceService governanceService,
                                    CompliancePolicyService compliancePolicyService,
                                    IndicatorService indicatorService,
                                    IfrsService ifrsService,
                                    EmissionsService emissionsService,
                                    AssuranceService assuranceService,
                                    ExportService exportService,
                                    PdfRenderer pdfRenderer) {
        this.companyRepository = companyRepository;
        this.currentUserProvider = currentUserProvider;
        this.appUserRepository = appUserRepository;
        this.materialityService = materialityService;
        this.governanceService = governanceService;
        this.compliancePolicyService = compliancePolicyService;
        this.indicatorService = indicatorService;
        this.ifrsService = ifrsService;
        this.emissionsService = emissionsService;
        this.assuranceService = assuranceService;
        this.exportService = exportService;
        this.pdfRenderer = pdfRenderer;
    }

    public record GeneratedReport(byte[] content, String filename) {
    }

    @Transactional
    /** @param record whether this counts as issuing the report; false for a preview. */
    public GeneratedReport generateReport(int fiscalYear, boolean record) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Company company = companyRepository.findById(companyId).orElseThrow(() -> new NotFoundException("Company not found"));
        AppUser reviewer = appUserRepository.findById(currentUserProvider.getPrincipal().userId()).orElse(null);

        List<AssessmentSummaryResponse> assessments = materialityService.listAssessments();
        AssessmentSummaryResponse latestAssessment = assessments.stream()
                .filter(a -> a.status() == AssessmentStatus.VALIDATED)
                .findFirst()
                .orElse(assessments.isEmpty() ? null : assessments.get(0));
        List<ScoreResponse> materialityScores = latestAssessment != null
                ? materialityService.getAssessment(latestAssessment.id()).scores().stream()
                        .sorted(Comparator.comparingInt((ScoreResponse s) -> s.impact() + s.influence()).reversed())
                        .toList()
                : List.of();

        List<GovernanceLevelResponse> structure = governanceService.getStructure().stream()
                .sorted(Comparator.comparingInt(l -> l.level().ordinal()))
                .toList();
        List<MatterOwnershipResponse> ownership = governanceService.getOwnership();
        List<CompliancePolicyResponse> policies = compliancePolicyService.getPolicies();
        boolean governanceUnlocked = company.getSubscriptionPlan().atLeast(SubscriptionPlan.GROWTH);

        List<IndicatorResponse> indicators = indicatorService.listIndicators();
        java.util.Map<String, java.math.BigDecimal> indicatorValueById = new java.util.HashMap<>();
        for (IndicatorResponse ind : indicators) {
            java.math.BigDecimal value = valueForYear(ind, fiscalYear);
            if (value != null) {
                indicatorValueById.put(ind.id(), value);
            }
        }

        int materialityPercentage = latestAssessment != null && latestAssessment.status() == AssessmentStatus.VALIDATED
                ? 100 : !assessments.isEmpty() ? 50 : 0;
        int governancePercentage = !governanceUnlocked ? 0 : structure.size() >= 3 ? 100 : structure.isEmpty() ? 0 : 50;
        long filledIndicators = indicators.stream().filter(ind -> valueForYear(ind, fiscalYear) != null).count();
        int indicatorsPercentage = indicators.isEmpty() ? 0 : (int) Math.round(filledIndicators * 100.0 / indicators.size());

        boolean climateUnlocked = company.getSubscriptionPlan().atLeast(SubscriptionPlan.ISSUER_READY);
        List<BusinessSegmentResponse> segments = climateUnlocked ? ifrsService.listSegments() : List.of();
        IfrsS1DisclosureResponse s1 = climateUnlocked ? ifrsService.getS1Disclosure() : null;
        IfrsS2Response s2 = climateUnlocked ? ifrsService.getS2() : null;
        EmissionsResponse emissions = climateUnlocked ? emissionsService.getEmissions() : null;
        java.math.BigDecimal scope1Value = ReportSupport.valueForYear(emissions != null ? emissions.scope1() : List.of(), fiscalYear);
        java.math.BigDecimal scope2Value = ReportSupport.valueForYear(emissions != null ? emissions.scope2() : List.of(), fiscalYear);
        java.math.BigDecimal scope3Total = ReportSupport.scope3TotalForYear(emissions, fiscalYear);
        int climatePercentage = climatePercentage(climateUnlocked, segments, s2, scope1Value, scope2Value, scope3Total);

        SignOffResponse signOff = assuranceService.list().stream()
                .filter(r -> r.fiscalYear() == fiscalYear)
                .findFirst()
                .orElse(null);

        Instant generatedAt = Instant.now();
        String checksum = ReportSupport.computeChecksum(buildSummaryText(company, fiscalYear, materialityScores, structure, ownership, policies, indicators,
                climateUnlocked, segments, s2, scope1Value, scope2Value, scope3Total));

        Context ctx = new Context(Locale.ENGLISH);
        ctx.setVariable("company", company);
        ctx.setVariable("frameworkLabel", frameworkLabel(company));
        ctx.setVariable("fiscalYear", fiscalYear);
        ctx.setVariable("reviewerName", reviewer != null ? reviewer.getName() : "Unknown");
        ctx.setVariable("generatedAt", generatedAt);
        ctx.setVariable("checksum", checksum);
        ctx.setVariable("materialityPercentage", materialityPercentage);
        ctx.setVariable("governancePercentage", governancePercentage);
        ctx.setVariable("indicatorsPercentage", indicatorsPercentage);
        ctx.setVariable("latestAssessment", latestAssessment);
        ctx.setVariable("materialityScores", materialityScores);
        ctx.setVariable("governanceUnlocked", governanceUnlocked);
        ctx.setVariable("structure", structure);
        ctx.setVariable("ownership", ownership);
        ctx.setVariable("policies", policies);
        ctx.setVariable("indicators", indicators);
        ctx.setVariable("filledIndicators", filledIndicators);
        ctx.setVariable("indicatorValueById", indicatorValueById);
        ctx.setVariable("climateUnlocked", climateUnlocked);
        ctx.setVariable("climatePercentage", climatePercentage);
        ctx.setVariable("segments", segments);
        ctx.setVariable("s1", s1);
        ctx.setVariable("s2", s2);
        ctx.setVariable("scope1Value", scope1Value);
        ctx.setVariable("scope2Value", scope2Value);
        ctx.setVariable("scope3Categories", emissions != null ? emissions.scope3() : List.of());
        ctx.setVariable("scope3Total", scope3Total);
        ctx.setVariable("scope3ValueByCategoryId", ReportSupport.scope3ValueByCategoryId(emissions, fiscalYear));
        ctx.setVariable("signOff", signOff);

        byte[] pdf = pdfRenderer.render("integrated-esg-report", ctx);

        if (record) {
            exportService.logClientGeneratedExport(
                    new LogExportRequest("Integrated ESG Report", ExportFormat.PDF, fiscalYear));
        }

        String filename = "WeSee_ESG_Integrated_Report_FY" + fiscalYear + ".pdf";
        return new GeneratedReport(pdf, filename);
    }

    /** SEDG only applies to SME/Starter-tier issuers — Main and ACE Market issuers report against
     *  Bursa's own Common Sustainability Matters framework, not SEDG. This was previously
     *  hardcoded to "SEDG" for every company regardless of market classification. */
    private String frameworkLabel(Company company) {
        return switch (company.getMarketClassification()) {
            case SME -> "Simplified ESG Disclosure Guide (SEDG)";
            case MAIN_MARKET -> "Bursa Malaysia Main Market Sustainability Reporting Guide";
            case ACE_MARKET -> "Bursa Malaysia ACE Market Sustainability Reporting Guide";
        };
    }

    private java.math.BigDecimal valueForYear(IndicatorResponse indicator, int fiscalYear) {
        return indicator.values().stream()
                .filter(v -> v.fiscalYear() == fiscalYear)
                .map(IndicatorValuePointDto::value)
                .findFirst()
                .orElse(null);
    }

    private int climatePercentage(boolean climateUnlocked, List<BusinessSegmentResponse> segments, IfrsS2Response s2,
                                   java.math.BigDecimal scope1Value, java.math.BigDecimal scope2Value, java.math.BigDecimal scope3Total) {
        if (!climateUnlocked) {
            return 0;
        }
        boolean hasS1Items = segments.stream().anyMatch(s -> !s.items().isEmpty());
        boolean hasS2Narrative = s2 != null && s2.oversightDescription() != null && !s2.oversightDescription().isBlank();
        boolean hasEmissionsForYear = scope1Value != null || scope2Value != null
                || (scope3Total != null && scope3Total.signum() > 0);
        long filled = java.util.stream.Stream.of(hasS1Items, hasS2Narrative, hasEmissionsForYear).filter(b -> b).count();
        return (int) Math.round(filled * 100.0 / 3);
    }

    private String buildSummaryText(Company company, int fiscalYear, List<ScoreResponse> materialityScores,
                                     List<GovernanceLevelResponse> structure, List<MatterOwnershipResponse> ownership,
                                     List<CompliancePolicyResponse> policies, List<IndicatorResponse> indicators,
                                     boolean climateUnlocked, List<BusinessSegmentResponse> segments, IfrsS2Response s2,
                                     java.math.BigDecimal scope1Value, java.math.BigDecimal scope2Value, java.math.BigDecimal scope3Total) {
        List<String> lines = new ArrayList<>();
        lines.add("Entity: " + company.getName());
        lines.add("Sector: " + (company.getSector() != null ? company.getSector().getName() : "Not set")
                + " | Market: " + company.getMarketClassification());
        lines.add("Period: FY" + fiscalYear);
        if (materialityScores.isEmpty()) {
            lines.add("No materiality assessment completed yet.");
        } else {
            materialityScores.forEach(s -> lines.add("- " + s.matterName() + " (Priority: " + s.priorityTier() + ")"));
        }
        if (structure.isEmpty()) {
            lines.add("No governance structure configured yet.");
        } else {
            structure.forEach(l -> lines.add(l.level().name() + ": " + l.roleTitle()));
            lines.add(ownership.size() + " sustainability matter(s) have assigned ownership.");
            policies.forEach(p -> lines.add(p.name() + ": " + p.status()));
        }
        indicators.forEach(ind -> {
            java.math.BigDecimal value = valueForYear(ind, fiscalYear);
            lines.add(ind.name() + ": " + (value != null ? value.toPlainString() : "N/A") + " " + (ind.unit() != null ? ind.unit() : ""));
        });
        if (!climateUnlocked) {
            lines.add("IFRS S1/S2 and GHG emissions disclosures not included (requires Issuer-Ready plan).");
        } else {
            segments.forEach(seg -> seg.items().forEach(item ->
                    lines.add("IFRS S1 [" + seg.name() + "]: " + item.title() + " (" + item.type() + ", " + item.horizon() + ")")));
            if (s2 != null) {
                lines.add("IFRS S2 Oversight: " + (s2.oversightDescription() != null ? s2.oversightDescription() : "Not disclosed"));
            }
            lines.add("Scope 1 GHG (FY" + fiscalYear + "): " + (scope1Value != null ? scope1Value.toPlainString() : "N/A") + " tCO2e");
            lines.add("Scope 2 GHG (FY" + fiscalYear + "): " + (scope2Value != null ? scope2Value.toPlainString() : "N/A") + " tCO2e");
            lines.add("Scope 3 GHG (FY" + fiscalYear + "): " + (scope3Total != null ? scope3Total.toPlainString() : "N/A") + " tCO2e");
        }
        return String.join("\n", lines);
    }
}
