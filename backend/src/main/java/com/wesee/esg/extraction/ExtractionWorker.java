package com.wesee.esg.extraction;

import com.wesee.esg.climate.EmissionFactorRepository;
import com.wesee.esg.reference.IndicatorDefinitionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Runs extraction off the request thread. Single-process only: if this instance dies mid-run the
 * document stays EXTRACTING and must be retried by hand. Acceptable at current scale; scaling out
 * would mean an outbox table and a poller instead.
 *
 * <p>Separate from ExtractionService because Spring's {@code @Async} proxy does not apply to
 * self-invocation — calling an async method from another method of the same bean runs it inline.
 */
@Component
public class ExtractionWorker {

    private static final Logger log = LoggerFactory.getLogger(ExtractionWorker.class);

    private final ExtractedDocumentRepository documentRepository;
    private final ExtractedRecordRepository recordRepository;
    private final ExtractionStorageService storageService;
    private final DocumentExtractor extractor;
    private final ExtractionContextProvider contextProvider;
    private final EmissionFactorRepository factorRepository;
    private final IndicatorDefinitionRepository indicatorDefinitionRepository;

    public ExtractionWorker(ExtractedDocumentRepository documentRepository,
                            ExtractedRecordRepository recordRepository,
                            ExtractionStorageService storageService,
                            DocumentExtractor extractor,
                            ExtractionContextProvider contextProvider,
                            EmissionFactorRepository factorRepository,
                            IndicatorDefinitionRepository indicatorDefinitionRepository) {
        this.documentRepository = documentRepository;
        this.recordRepository = recordRepository;
        this.storageService = storageService;
        this.extractor = extractor;
        this.contextProvider = contextProvider;
        this.factorRepository = factorRepository;
        this.indicatorDefinitionRepository = indicatorDefinitionRepository;
    }

    /**
     * Runs after the uploading transaction commits, on another thread. Both halves matter: async so
     * the request does not wait on a model, and after-commit so the row is actually visible — firing
     * on commit-pending data silently finds nothing and the document sits in PENDING forever.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onExtractionRequested(ExtractionRequestedEvent event) {
        runExtraction(event.documentId(), event.companyId());
    }

    void runExtraction(UUID documentId, UUID companyId) {
        ExtractedDocument document = documentRepository.findByIdAndCompanyId(documentId, companyId).orElse(null);
        if (document == null) {
            // Never silent: this is what a fire-before-commit bug looks like from in here.
            log.error("Extraction requested for document {} (company {}) but no such row was visible",
                    documentId, companyId);
            return;
        }

        document.setStatus(ExtractionStatus.EXTRACTING);
        documentRepository.save(document);

        try {
            ExtractionContext context = contextProvider.contextFor(companyId);
            byte[] content = storageService.read(document.getStoredPath());
            ExtractionResult result = extractor.extract(content, null, context);

            List<ProposalValidator.ValidatedProposal> valid =
                    ProposalValidator.validate(result.records(), context);

            for (ProposalValidator.ValidatedProposal proposal : valid) {
                recordRepository.save(toEntity(proposal, document, companyId));
            }

            document.setModelUsed(result.modelUsed());
            document.setExtractedAt(Instant.now());
            document.setStatus(ExtractionStatus.READY);
        } catch (Exception e) {
            log.warn("Extraction failed for document {}", documentId, e);
            document.setStatus(ExtractionStatus.FAILED);
            document.setFailureReason(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        }
        documentRepository.save(document);
    }

    private ExtractedRecord toEntity(ProposalValidator.ValidatedProposal proposal,
                                      ExtractedDocument document, UUID companyId) {
        ProposedRecord source = proposal.source();
        ExtractedRecord entity = new ExtractedRecord();
        entity.setCompanyId(companyId);
        entity.setDocument(document);
        entity.setTargetType(source.targetType());
        entity.setFiscalYear(source.fiscalYear());
        entity.setMonth(source.month());
        entity.setValue(proposal.convertedValue());
        entity.setUnitAsRead(source.unitAsRead());
        entity.setConfidence(source.confidence());
        entity.setSourceSnippet(source.sourceSnippet());
        entity.setStatus(RecordStatus.PROPOSED);

        if (source.targetType() == ExtractionTargetType.EMISSION_ACTIVITY) {
            entity.setEmissionFactor(factorRepository.findById(proposal.resolvedTargetId()).orElseThrow());
            entity.setQuantity(proposal.convertedValue());
        } else {
            entity.setIndicatorDefinition(
                    indicatorDefinitionRepository.findById(proposal.resolvedTargetId()).orElseThrow());
        }
        return entity;
    }
}
