package com.wesee.esg.evidence;

import com.wesee.esg.extraction.DocumentTranscription;
import com.wesee.esg.extraction.ExtractedDocument;
import com.wesee.esg.extraction.GeminiEmbedder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Turns a document's transcription into searchable passages.
 *
 * <p>The corpus is the transcription that extraction already stored — nothing is read from the file
 * again and no second call is made to look at it. Indexing an existing document costs one embedding
 * request per passage and nothing else.
 *
 * <p>Passages, not fixed-size windows: a bill is labelled values and tables, and the label is what
 * makes a value mean anything. "612,340" retrieved on its own is noise; "Penggunaan Puncak (kWh) —
 * 612,340" is evidence. Each field becomes one passage and each table row becomes one, carrying its
 * column headings.
 */
@Service
public class EvidenceIndexer {

    private static final Logger log = LoggerFactory.getLogger(EvidenceIndexer.class);

    /** Below this a passage is a fragment — a bare unit or an empty cell — and only adds noise. */
    private static final int MIN_CHARS = 12;

    private final EvidenceChunkRepository repository;
    private final GeminiEmbedder embedder;

    public EvidenceIndexer(EvidenceChunkRepository repository, GeminiEmbedder embedder) {
        this.repository = repository;
        this.embedder = embedder;
    }

    /** Re-indexing replaces: a document read twice must not answer twice. */
    @Transactional
    public int index(ExtractedDocument document) {
        DocumentTranscription t = document.getTranscription();
        if (t == null) {
            return 0;
        }
        List<String> passages = passagesOf(t);
        if (passages.isEmpty()) {
            return 0;
        }

        repository.deleteForDocument(document.getId());
        int written = 0;
        for (String passage : passages) {
            try {
                repository.insert(document.getCompanyId(), document.getId(), written, passage,
                        null, embedder.forIndexing(passage));
                written++;
            } catch (Exception e) {
                // One passage failing should not cost the document its index. A gap in the corpus
                // weakens a search; an exception here would leave the document with none at all.
                log.warn("Could not index passage {} of document {}: {}",
                        written, document.getId(), e.getMessage());
            }
        }
        log.info("Indexed {} passage(s) for document {}", written, document.getId());
        return written;
    }

    static List<String> passagesOf(DocumentTranscription t) {
        List<String> out = new ArrayList<>();

        for (DocumentTranscription.Field f : t.fields()) {
            String label = f.labelEnglish() != null && !f.labelEnglish().isBlank()
                    ? f.label() + " (" + f.labelEnglish() + ")"
                    : f.label();
            add(out, label + ": " + f.value());
        }

        for (DocumentTranscription.Table table : t.tables()) {
            String title = table.titleEnglish() != null && !table.titleEnglish().isBlank()
                    ? table.title() + " (" + table.titleEnglish() + ")"
                    : table.title();
            for (List<String> row : table.rows()) {
                StringBuilder sb = new StringBuilder();
                if (title != null && !title.isBlank()) {
                    sb.append(title).append(" — ");
                }
                for (int i = 0; i < row.size(); i++) {
                    if (i > 0) {
                        sb.append(", ");
                    }
                    String column = i < table.columns().size() ? table.columns().get(i) : null;
                    if (column != null && !column.isBlank()) {
                        sb.append(column).append(' ');
                    }
                    sb.append(row.get(i));
                }
                add(out, sb.toString());
            }
        }
        return out;
    }

    private static void add(List<String> out, String passage) {
        String trimmed = passage == null ? "" : passage.trim();
        if (trimmed.length() >= MIN_CHARS) {
            out.add(trimmed);
        }
    }
}
