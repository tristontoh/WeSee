package com.wesee.esg.materiality;

import com.wesee.esg.materiality.dto.AddStakeholderRequest;
import com.wesee.esg.materiality.dto.AssessmentDetailResponse;
import com.wesee.esg.materiality.dto.AssessmentSummaryResponse;
import com.wesee.esg.materiality.dto.CreateAssessmentRequest;
import com.wesee.esg.materiality.dto.StakeholderOptionResponse;
import com.wesee.esg.materiality.dto.ToggleStakeholderRequest;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/materiality")
public class MaterialityController {

    private final MaterialityService materialityService;
    private final MaterialityReportService materialityReportService;

    public MaterialityController(MaterialityService materialityService, MaterialityReportService materialityReportService) {
        this.materialityService = materialityService;
        this.materialityReportService = materialityReportService;
    }

    @GetMapping("/stakeholder-options")
    public List<StakeholderOptionResponse> listStakeholderOptions() {
        return materialityService.listStakeholderOptions();
    }

    @PostMapping("/stakeholder-options")
    public ResponseEntity<StakeholderOptionResponse> addStakeholder(@Valid @RequestBody AddStakeholderRequest request) {
        return ResponseEntity.ok(materialityService.addStakeholder(request));
    }

    @PatchMapping("/stakeholder-options/{id}")
    public StakeholderOptionResponse toggleStakeholder(@PathVariable UUID id, @Valid @RequestBody ToggleStakeholderRequest request) {
        return materialityService.toggleStakeholder(id, request);
    }

    @DeleteMapping("/stakeholder-options/{id}")
    public ResponseEntity<Void> deleteStakeholder(@PathVariable UUID id) {
        materialityService.deleteStakeholder(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/assessments")
    public List<AssessmentSummaryResponse> listAssessments() {
        return materialityService.listAssessments();
    }

    @GetMapping("/assessments/{id}")
    public AssessmentDetailResponse getAssessment(@PathVariable UUID id) {
        return materialityService.getAssessment(id);
    }

    @GetMapping("/assessments/{id}/report.pdf")
    public ResponseEntity<byte[]> downloadReport(@PathVariable UUID id) {
        MaterialityReportService.GeneratedReport report = materialityReportService.generateReport(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment().filename(report.filename()).build());
        return ResponseEntity.ok().headers(headers).contentType(MediaType.APPLICATION_PDF).body(report.content());
    }

    @PostMapping("/assessments")
    public ResponseEntity<AssessmentDetailResponse> createAssessment(@Valid @RequestBody CreateAssessmentRequest request) {
        return ResponseEntity.ok(materialityService.createAssessment(request));
    }

    /** Board/management validation step (Bursa Malaysia's Identify → Prioritise → Validate process). */
    @PatchMapping("/assessments/{id}/validate")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public AssessmentDetailResponse validateAssessment(@PathVariable UUID id) {
        return materialityService.validateAssessment(id);
    }
}
