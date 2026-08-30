/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.evidence;

import java.util.UUID;

/**
 * One passage that might support a claim, and how close it actually was.
 *
 * @param distance cosine distance, 0 identical. Carried through to the caller so a weak match can
 *                 be shown as one rather than dressed up as a citation.
 */
public record EvidenceHit(UUID chunkId,
                          UUID documentId,
                          String documentName,
                          String content,
                          Integer sourcePage,
                          double distance) {
}
