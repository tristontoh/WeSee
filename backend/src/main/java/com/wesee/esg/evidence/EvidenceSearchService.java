package com.wesee.esg.evidence;

import com.wesee.esg.extraction.ExtractedDocument;
import com.wesee.esg.extraction.ExtractedDocumentRepository;
import com.wesee.esg.extraction.GeminiEmbedder;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Finds passages that might support a claim.
 *
 * <p>Everything this returns is a suggestion. A figure's provenance is recorded when it is read and
 * lives on the record itself; this is similarity search over prose, which can miss the right
 * passage and can rank an irrelevant one first. Callers are given the distance so they can say so.
 */
@Service
public class EvidenceSearchService {

    /**
     * Past this, a passage is unrelated.
     *
     * <p>Measured, not guessed. Against a corpus of utility bills, questions the documents can
     * answer come back at 0.65–0.67 similarity and questions they cannot — "board oversight of
     * climate risk", where the corpus holds no minutes at all — still return invoice numbers and
     * meter readings at 0.52–0.56. The gap is narrow, and a threshold set above it hands a reviewer
     * a reference number from an electricity bill as evidence of board governance. A product whose
     * point is that claims are checkable must not manufacture the appearance of a check.
     *
     * <p>0.38 distance is ~0.62 similarity: below the weakest real match seen, above the strongest
     * piece of noise. Returning nothing is the correct answer when the corpus holds nothing.
     */
    private static final double MAX_DISTANCE = 0.38;

    private static final int MAX_RESULTS = 5;

    private final EvidenceChunkRepository chunks;
    private final ExtractedDocumentRepository documents;
    private final EvidenceIndexer indexer;
    private final GeminiEmbedder embedder;
    private final CurrentUserProvider currentUser;

    public EvidenceSearchService(EvidenceChunkRepository chunks,
                                 ExtractedDocumentRepository documents,
                                 EvidenceIndexer indexer,
                                 GeminiEmbedder embedder,
                                 CurrentUserProvider currentUser) {
        this.chunks = chunks;
        this.documents = documents;
        this.indexer = indexer;
        this.embedder = embedder;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public List<EvidenceHit> search(String claim) {
        if (claim == null || claim.isBlank()) {
            return List.of();
        }
        return chunks.search(currentUser.requireCompanyId(), embedder.forQuery(claim), MAX_RESULTS)
                .stream()
                .filter(hit -> hit.distance() <= MAX_DISTANCE)
                .toList();
    }

    /**
     * Indexes anything read before this feature existed.
     *
     * <p>Explicit rather than automatic on boot: it spends an embedding request per passage against
     * the operator's own key, and a platform that quietly bills someone for a backfill they did not
     * ask for has made a decision that was theirs to make.
     */
    @Transactional
    public int backfill() {
        int total = 0;
        for (ExtractedDocument document : documents.findByCompanyIdOrderByCreatedAtDescIdDesc(currentUser.requireCompanyId())) {
            if (!chunks.isIndexed(document.getId())) {
                total += indexer.index(document);
            }
        }
        return total;
    }
}
