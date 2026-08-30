/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.evidence.dto;

import com.wesee.esg.evidence.EvidenceHit;

import java.util.UUID;

/**
 * A passage that might support a claim.
 *
 * @param confidence 0–1, from cosine distance. Sent so the client can show a weak match as weak:
 *                   a retrieved passage is a suggestion, and presenting all of them alike is how a
 *                   search result ends up quoted in a report as though it were a source.
 */
public record EvidenceHitResponse(UUID chunkId,
                                  UUID documentId,
                                  String documentName,
                                  String content,
                                  Integer sourcePage,
                                  double confidence) {

    public static EvidenceHitResponse from(EvidenceHit hit) {
        return new EvidenceHitResponse(hit.chunkId(), hit.documentId(), hit.documentName(),
                hit.content(), hit.sourcePage(),
                Math.round(Math.max(0, 1 - hit.distance()) * 100) / 100.0);
    }
}
