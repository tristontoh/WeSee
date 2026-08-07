package com.wesee.esg.governance;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.export.ExportFormat;
import com.wesee.esg.export.ExportService;
import com.wesee.esg.export.dto.LogExportRequest;
import com.wesee.esg.governance.dto.CompliancePolicyResponse;
import com.wesee.esg.governance.dto.GovernanceLevelResponse;
import com.wesee.esg.governance.dto.MatterOwnershipResponse;
import com.wesee.esg.pdf.PdfRenderer;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;

import java.time.Instant;
import java.time.Year;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/** Renders the Governance & Compliance structure as a professional PDF via the {@code governance-report} Thymeleaf template. */
@Service
public class GovernanceReportService {

    private final GovernanceService governanceService;
    private final CompliancePolicyService compliancePolicyService;
    private final CompanyRepository companyRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ExportService exportService;
    private final PdfRenderer pdfRenderer;

    public GovernanceReportService(GovernanceService governanceService,
                                    CompliancePolicyService compliancePolicyService,
                                    CompanyRepository companyRepository,
                                    CurrentUserProvider currentUserProvider,
                                    ExportService exportService,
                                    PdfRenderer pdfRenderer) {
        this.governanceService = governanceService;
        this.compliancePolicyService = compliancePolicyService;
        this.companyRepository = companyRepository;
        this.currentUserProvider = currentUserProvider;
        this.exportService = exportService;
        this.pdfRenderer = pdfRenderer;
    }

    public record GeneratedReport(byte[] content, String filename) {
    }

    @Transactional
    public GeneratedReport generateReport() {
        Company company = companyRepository.findById(currentUserProvider.requireCompanyId())
                .orElseThrow(() -> new NotFoundException("Company not found"));

        List<GovernanceLevelResponse> structure = governanceService.getStructure().stream()
                .sorted(Comparator.comparingInt(l -> l.level().ordinal()))
                .toList();
        List<MatterOwnershipResponse> ownership = governanceService.getOwnership();
        List<CompliancePolicyResponse> policies = compliancePolicyService.getPolicies();

        Context ctx = new Context(Locale.ENGLISH);
        ctx.setVariable("company", company);
        ctx.setVariable("structure", structure);
        ctx.setVariable("ownership", ownership);
        ctx.setVariable("policies", policies);
        ctx.setVariable("generatedAt", Instant.now());

        byte[] pdf = pdfRenderer.render("governance-report", ctx);

        exportService.logClientGeneratedExport(new LogExportRequest(
                "Governance & Compliance Report", ExportFormat.PDF, Year.now().getValue()));

        String safeName = company.getName().replaceAll("[^a-zA-Z0-9]+", "_");
        String filename = "WeSee_Governance_Report_" + safeName + ".pdf";
        return new GeneratedReport(pdf, filename);
    }
}
