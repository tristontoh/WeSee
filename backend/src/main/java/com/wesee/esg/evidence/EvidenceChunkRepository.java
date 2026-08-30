/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.evidence;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Reads and writes the evidence corpus directly.
 *
 * <p>No JPA entity: the embedding is a pgvector column, which Hibernate has no mapping for, and a
 * table that exists only to be similarity-searched gains nothing from one. Tenant scoping is
 * written into every query rather than left to the {@code companyFilter} — this is a search that
 * returns document text, and the boundary should be visible in the statement that crosses it.
 */
@Repository
public class EvidenceChunkRepository {

    private final JdbcTemplate jdbc;

    public EvidenceChunkRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Everything indexed for one document, so a re-index replaces rather than duplicates. */
    public void deleteForDocument(UUID documentId) {
        jdbc.update("DELETE FROM evidence_chunk WHERE document_id = ?", documentId);
    }

    public void insert(UUID companyId, UUID documentId, int ordinal, String content,
                       Integer sourcePage, float[] embedding) {
        jdbc.update("""
                INSERT INTO evidence_chunk (id, company_id, document_id, ordinal, content, source_page, embedding)
                VALUES (?, ?, ?, ?, ?, ?, CAST(? AS vector))
                """,
                UUID.randomUUID(), companyId, documentId, ordinal, content, sourcePage, toVector(embedding));
    }

    public boolean isIndexed(UUID documentId) {
        Integer n = jdbc.queryForObject(
                "SELECT count(*) FROM evidence_chunk WHERE document_id = ?", Integer.class, documentId);
        return n != null && n > 0;
    }

    /**
     * The closest passages within one company, nearest first.
     *
     * <p>Distance comes back with the row on purpose: a caller showing these to a reviewer needs to
     * say how close a match is, and a list of confident-looking quotes with nothing to separate a
     * strong hit from a weak one is exactly the failure this feature exists to avoid.
     */
    public List<EvidenceHit> search(UUID companyId, float[] query, int limit) {
        return jdbc.query("""
                SELECT c.id, c.document_id, d.original_file_name, c.content, c.source_page,
                       c.embedding <=> CAST(? AS vector) AS distance
                FROM evidence_chunk c
                JOIN extracted_document d ON d.id = c.document_id
                WHERE c.company_id = ?
                ORDER BY distance
                LIMIT ?
                """,
                (rs, i) -> new EvidenceHit(
                        UUID.fromString(rs.getString("id")),
                        UUID.fromString(rs.getString("document_id")),
                        rs.getString("original_file_name"),
                        rs.getString("content"),
                        rs.getObject("source_page") == null ? null : rs.getInt("source_page"),
                        rs.getDouble("distance")),
                toVector(query), companyId, limit);
    }

    /** pgvector's text form: [0.1,0.2,…]. */
    private static String toVector(float[] v) {
        StringBuilder sb = new StringBuilder(v.length * 8).append('[');
        for (int i = 0; i < v.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(v[i]);
        }
        return sb.append(']').toString();
    }
}
