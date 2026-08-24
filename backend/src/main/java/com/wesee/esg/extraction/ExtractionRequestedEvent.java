package com.wesee.esg.extraction;

import java.util.UUID;

/**
 * Raised when a document is ready to be extracted. Deliberately an event rather than a direct
 * call: the worker runs on another thread, so it must not start until the transaction that wrote
 * the extracted_document row has committed — otherwise it looks the row up and finds nothing.
 */
public record ExtractionRequestedEvent(UUID documentId, UUID companyId) {
}
