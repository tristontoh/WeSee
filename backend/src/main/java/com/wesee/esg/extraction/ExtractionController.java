package com.wesee.esg.extraction;

import com.wesee.esg.extraction.dto.AcceptRecordRequest;
import com.wesee.esg.extraction.dto.ExtractedDocumentResponse;
import com.wesee.esg.extraction.dto.ExtractedRecordResponse;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/extraction")
public class ExtractionController {

    private final ExtractionService extractionService;
    private final ExtractionReviewService reviewService;

    public ExtractionController(ExtractionService extractionService, ExtractionReviewService reviewService) {
        this.extractionService = extractionService;
        this.reviewService = reviewService;
    }

    @PostMapping("/documents")
    public ExtractedDocumentResponse upload(@RequestParam("file") MultipartFile file) {
        return extractionService.get(extractionService.upload(file));
    }

    @GetMapping("/documents")
    public List<ExtractedDocumentResponse> list() {
        return extractionService.list();
    }

    @GetMapping("/documents/{id}")
    public ExtractedDocumentResponse get(@PathVariable UUID id) {
        return extractionService.get(id);
    }

    /**
     * Serves the stored document back for the detail screen's preview.
     *
     * <p>{@code inline}, unlike the evidence download's {@code attachment}: attachment makes a
     * browser offer the file for saving rather than render it, which would leave the preview blank.
     */
    @GetMapping("/documents/{id}/file")
    public ResponseEntity<Resource> file(@PathVariable UUID id) {
        ExtractionService.StoredDocument stored = extractionService.readFile(id);

        return ResponseEntity.ok()
                .contentType(DocumentContentType.forFileName(stored.originalFileName()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(stored.originalFileName()).toString())
                .body(new ByteArrayResource(stored.content()));
    }

    @PostMapping("/documents/{id}/retry")
    public ExtractedDocumentResponse retry(@PathVariable UUID id) {
        extractionService.retry(id);
        return extractionService.get(id);
    }

    @PostMapping("/records/{id}/accept")
    public ExtractedRecordResponse accept(@PathVariable UUID id,
                                           @RequestBody(required = false) AcceptRecordRequest request) {
        return reviewService.accept(id, request != null ? request : new AcceptRecordRequest(null, null, null));
    }

    @PostMapping("/records/{id}/reject")
    public ExtractedRecordResponse reject(@PathVariable UUID id) {
        return reviewService.reject(id);
    }
}
