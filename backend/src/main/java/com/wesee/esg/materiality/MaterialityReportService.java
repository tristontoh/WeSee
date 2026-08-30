/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.materiality;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.export.ExportFormat;
import com.wesee.esg.export.ExportService;
import com.wesee.esg.export.dto.LogExportRequest;
import com.wesee.esg.materiality.dto.AssessmentDetailResponse;
import com.wesee.esg.pdf.PdfRenderer;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

/** Renders the Materiality Assessment as a professional PDF via the {@code materiality-report} Thymeleaf template. */
@Service
public class MaterialityReportService {

    private final MaterialityService materialityService;
    private final CompanyRepository companyRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ExportService exportService;
    private final PdfRenderer pdfRenderer;

    public MaterialityReportService(MaterialityService materialityService,
                                     CompanyRepository companyRepository,
                                     CurrentUserProvider currentUserProvider,
                                     ExportService exportService,
                                     PdfRenderer pdfRenderer) {
        this.materialityService = materialityService;
        this.companyRepository = companyRepository;
        this.currentUserProvider = currentUserProvider;
        this.exportService = exportService;
        this.pdfRenderer = pdfRenderer;
    }

    public record GeneratedReport(byte[] content, String filename) {
    }

    @Transactional
    public GeneratedReport generateReport(UUID assessmentId) {
        AssessmentDetailResponse assessment = materialityService.getAssessment(assessmentId);
        UUID companyId = currentUserProvider.requireCompanyId();
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));

        Context ctx = new Context(Locale.ENGLISH);
        ctx.setVariable("company", company);
        ctx.setVariable("assessment", assessment);
        ctx.setVariable("stakeholders", assessment.stakeholders());
        ctx.setVariable("scores", assessment.scores());
        ctx.setVariable("generatedAt", Instant.now());

        byte[] pdf = pdfRenderer.render("materiality-report", ctx);

        exportService.logClientGeneratedExport(new LogExportRequest(
                "Materiality Assessment Report", ExportFormat.PDF, assessment.assessmentDate().getYear()));

        String safeName = assessment.name().replaceAll("[^a-zA-Z0-9]+", "_");
        String filename = "WeSee_Materiality_Report_" + safeName + ".pdf";
        return new GeneratedReport(pdf, filename);
    }
}
