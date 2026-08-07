package com.wesee.esg.indicators;

import com.wesee.esg.indicators.dto.AuditEntryDto;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLConnection;
import java.util.UUID;

/** Real evidence attachment for indicator audit entries — uploads to local disk, no cloud dependency. */
@RestController
@RequestMapping("/api/v1/indicators/audit-entries")
public class IndicatorEvidenceController {

    private final IndicatorEvidenceService evidenceService;

    public IndicatorEvidenceController(IndicatorEvidenceService evidenceService) {
        this.evidenceService = evidenceService;
    }

    @PostMapping("/{auditEntryId}/evidence")
    public AuditEntryDto uploadEvidence(@PathVariable UUID auditEntryId, @RequestParam("file") MultipartFile file) {
        return evidenceService.attachEvidence(auditEntryId, file);
    }

    @GetMapping("/{auditEntryId}/evidence")
    public ResponseEntity<Resource> downloadEvidence(@PathVariable UUID auditEntryId) {
        IndicatorEvidenceService.StoredFile stored = evidenceService.downloadEvidence(auditEntryId);
        Resource resource = new FileSystemResource(stored.path());
        String contentType = URLConnection.guessContentTypeFromName(stored.originalFileName());

        return ResponseEntity.ok()
                .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + stored.originalFileName() + "\"")
                .body(resource);
    }
}
