package com.wesee.esg.export;

import com.wesee.esg.climate.EmissionsService;
import com.wesee.esg.climate.IfrsService;
import com.wesee.esg.climate.dto.BusinessSegmentResponse;
import com.wesee.esg.climate.dto.EmissionsResponse;
import com.wesee.esg.climate.dto.IfrsS1DisclosureResponse;
import com.wesee.esg.climate.dto.IfrsS2Response;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.export.dto.LogExportRequest;
import com.wesee.esg.pdf.PdfRenderer;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Renders standalone IFRS S1 and IFRS S2 disclosure PDFs, independent of the full Integrated ESG Report. */
@Service
public class IfrsReportService {

    private final CompanyRepository companyRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AppUserRepository appUserRepository;
    private final IfrsService ifrsService;
    private final EmissionsService emissionsService;
    private final ExportService exportService;
    private final PdfRenderer pdfRenderer;

    public IfrsReportService(CompanyRepository companyRepository,
                              CurrentUserProvider currentUserProvider,
                              AppUserRepository appUserRepository,
                              IfrsService ifrsService,
                              EmissionsService emissionsService,
                              ExportService exportService,
                              PdfRenderer pdfRenderer) {
        this.companyRepository = companyRepository;
        this.currentUserProvider = currentUserProvider;
        this.appUserRepository = appUserRepository;
        this.ifrsService = ifrsService;
        this.emissionsService = emissionsService;
        this.exportService = exportService;
        this.pdfRenderer = pdfRenderer;
    }

    public record GeneratedReport(byte[] content, String filename) {
    }

    @Transactional
    /** @param record whether this counts as issuing the report; false for a preview. */
    public GeneratedReport generateS1Report(int fiscalYear, boolean record) {
        Company company = requireCompany();
        AppUser reviewer = currentReviewer();
        List<BusinessSegmentResponse> segments = ifrsService.listSegments();
        IfrsS1DisclosureResponse s1Disclosure = ifrsService.getS1Disclosure();

        Context ctx = baseContext(company, fiscalYear, reviewer);
        ctx.setVariable("segments", segments);
        ctx.setVariable("s1", s1Disclosure);

        byte[] pdf = pdfRenderer.render("ifrs-s1-report", ctx);
        if (record) {
            exportService.logClientGeneratedExport(
                    new LogExportRequest("IFRS S1 Report", ExportFormat.PDF, fiscalYear));
        }
        return new GeneratedReport(pdf, "WeSee_IFRS_S1_Report_FY" + fiscalYear + ".pdf");
    }

    @Transactional
    /** @param record whether this counts as issuing the report; false for a preview. */
    public GeneratedReport generateS2Report(int fiscalYear, boolean record) {
        Company company = requireCompany();
        AppUser reviewer = currentReviewer();
        IfrsS2Response s2 = ifrsService.getS2();
        EmissionsResponse emissions = emissionsService.getEmissions();
        BigDecimal scope1Value = ReportSupport.valueForYear(emissions.scope1(), fiscalYear);
        BigDecimal scope2Value = ReportSupport.valueForYear(emissions.scope2(), fiscalYear);
        BigDecimal scope3Total = ReportSupport.scope3TotalForYear(emissions, fiscalYear);

        Context ctx = baseContext(company, fiscalYear, reviewer);
        ctx.setVariable("s2", s2);
        ctx.setVariable("scope1Value", scope1Value);
        ctx.setVariable("scope2Value", scope2Value);
        ctx.setVariable("scope3Categories", emissions.scope3());
        ctx.setVariable("scope3Total", scope3Total);
        ctx.setVariable("scope3ValueByCategoryId", ReportSupport.scope3ValueByCategoryId(emissions, fiscalYear));

        byte[] pdf = pdfRenderer.render("ifrs-s2-report", ctx);
        if (record) {
            exportService.logClientGeneratedExport(
                    new LogExportRequest("IFRS S2 Report", ExportFormat.PDF, fiscalYear));
        }
        return new GeneratedReport(pdf, "WeSee_IFRS_S2_Report_FY" + fiscalYear + ".pdf");
    }

    private Company requireCompany() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return companyRepository.findById(companyId).orElseThrow(() -> new NotFoundException("Company not found"));
    }

    private AppUser currentReviewer() {
        return appUserRepository.findById(currentUserProvider.getPrincipal().userId()).orElse(null);
    }

    private Context baseContext(Company company, int fiscalYear, AppUser reviewer) {
        Context ctx = new Context(Locale.ENGLISH);
        ctx.setVariable("company", company);
        ctx.setVariable("fiscalYear", fiscalYear);
        ctx.setVariable("reviewerName", reviewer != null ? reviewer.getName() : "Unknown");
        ctx.setVariable("generatedAt", Instant.now());
        return ctx;
    }
}
