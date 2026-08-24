package com.wesee.esg.extraction;

/**
 * The seam between this platform and whatever reads documents. One method, so an on-premise
 * implementation is a contained swap if a tenant ever requires one.
 */
public interface DocumentExtractor {

    /**
     * @param content     the raw uploaded bytes
     * @param contentType the browser-supplied MIME type, or null
     * @param context     the closed set of factors and indicators this tenant has
     * @throws ExtractionFailedException when the document cannot be read at all
     */
    ExtractionResult extract(byte[] content, String contentType, ExtractionContext context);
}
