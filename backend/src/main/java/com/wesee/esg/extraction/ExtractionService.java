package com.wesee.esg.extraction;

import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.extraction.dto.ExtractedDocumentResponse;
import com.wesee.esg.extraction.dto.ExtractedRecordResponse;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.context.ApplicationEventPublisher;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
public class ExtractionService {

    private final ExtractedDocumentRepository documentRepository;
    private final ExtractedRecordRepository recordRepository;
    private final ExtractionStorageService storageService;
    private final ApplicationEventPublisher events;
    private final AppUserRepository appUserRepository;
    private final CurrentUserProvider currentUserProvider;

    public ExtractionService(ExtractedDocumentRepository documentRepository,
                             ExtractedRecordRepository recordRepository,
                             ExtractionStorageService storageService,
                             ApplicationEventPublisher events,
                             AppUserRepository appUserRepository,
                             CurrentUserProvider currentUserProvider) {
        this.documentRepository = documentRepository;
        this.recordRepository = recordRepository;
        this.storageService = storageService;
        this.events = events;
        this.appUserRepository = appUserRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public UUID upload(MultipartFile file) {
        UUID companyId = currentUserProvider.requireCompanyId();

        ExtractedDocument document = new ExtractedDocument();
        document.setCompanyId(companyId);
        document.setOriginalFileName(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "document");
        document.setUploadedBy(displayName());
        document.setStatus(ExtractionStatus.PENDING);
        document.setStoredPath("pending");
        document = documentRepository.save(document);

        document.setStoredPath(storageService.store(companyId, document.getId(), file));
        documentRepository.save(document);

        // Published, not called: the worker runs on another thread and must not start until
        // this transaction commits, or it looks the row up and finds nothing.
        events.publishEvent(new ExtractionRequestedEvent(document.getId(), companyId));
        return document.getId();
    }

    @Transactional(readOnly = true)
    public List<ExtractedDocumentResponse> list() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return documentRepository.findByCompanyIdOrderByCreatedAtDescIdDesc(companyId).stream()
                .map(d -> ExtractedDocumentResponse.from(d, recordsFor(d.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ExtractedDocumentResponse get(UUID documentId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        ExtractedDocument document = documentRepository.findByIdAndCompanyId(documentId, companyId)
                .orElseThrow(() -> new NotFoundException("Document not found"));
        return ExtractedDocumentResponse.from(document, recordsFor(documentId));
    }

    @Transactional
    public void retry(UUID documentId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        ExtractedDocument document = documentRepository.findByIdAndCompanyId(documentId, companyId)
                .orElseThrow(() -> new NotFoundException("Document not found"));
        if (document.getStatus() != ExtractionStatus.FAILED) {
            throw new ConflictException("Only a failed document can be retried");
        }
        recordRepository.deleteByDocumentId(documentId);
        document.setStatus(ExtractionStatus.PENDING);
        document.setFailureReason(null);
        documentRepository.save(document);
        events.publishEvent(new ExtractionRequestedEvent(documentId, companyId));
    }

    private List<ExtractedRecordResponse> recordsFor(UUID documentId) {
        return recordRepository.findByDocumentIdOrderByCreatedAtAscIdAsc(documentId).stream()
                .map(ExtractedRecordResponse::from)
                .toList();
    }

    /** WeSeePrincipal carries no name, so the user is looked up — as IndicatorService does. */
    private String displayName() {
        return appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .map(AppUser::getName)
                .orElse(currentUserProvider.getPrincipal().email());
    }
}
