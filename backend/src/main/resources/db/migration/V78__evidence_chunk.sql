-- Retrievable evidence for the parts of a report that are prose.
--
-- Figures already carry their own provenance: extracted_record keeps the snippet and the page the
-- reading came from, recorded at extraction time. That is a causal link, and nothing here replaces
-- it — searching for a fact you already recorded would be slower and occasionally wrong.
--
-- What has no provenance is the narrative. An IFRS S1 oversight description asserting that the
-- board reviews climate risk quarterly is written by a person, or drafted by a model, and nothing
-- in the system supports it. These chunks are the corpus that lets a reviewer go looking.
--
-- Additive: no existing table changes. With this table empty the rest of the platform behaves
-- exactly as before.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE evidence_chunk (
    id           UUID PRIMARY KEY,
    company_id   UUID NOT NULL REFERENCES company (id),
    document_id  UUID NOT NULL REFERENCES extracted_document (id) ON DELETE CASCADE,
    ordinal      INTEGER NOT NULL,
    -- The text a reviewer is shown, verbatim from the transcription.
    content      TEXT NOT NULL,
    -- 1-based page, when the transcription carried one. Null is honest: an image has no pages.
    source_page  INTEGER,
    -- text-embedding-004 returns 768 dimensions.
    embedding    vector(768) NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT evidence_chunk_document_ordinal UNIQUE (document_id, ordinal)
);

-- Retrieval is always within one tenant, never across.
CREATE INDEX idx_evidence_chunk_company ON evidence_chunk (company_id);

-- Cosine distance; lists tuned for a small corpus, revisit past ~100k chunks.
CREATE INDEX idx_evidence_chunk_embedding ON evidence_chunk
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMENT ON TABLE evidence_chunk IS
    'Embedded passages from document transcriptions, searched to suggest support for narrative claims. Suggestions, not provenance — see extracted_record for recorded sources.';
