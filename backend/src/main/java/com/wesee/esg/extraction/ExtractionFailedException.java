package com.wesee.esg.extraction;

/** The document could not be read at all — distinct from reading it and finding nothing. */
public class ExtractionFailedException extends RuntimeException {

    public ExtractionFailedException(String message, Throwable cause) {
        super(message, cause);
    }

    public ExtractionFailedException(String message) {
        super(message);
    }
}
