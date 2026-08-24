package com.wesee.esg.extraction;

/**
 * Names what an uploaded document actually is, from its own leading bytes.
 *
 * <p>Neither the upload's file name nor its browser-supplied content type is consulted: the worker
 * passes no content type at all, and {@code original_file_name} is client-supplied — the same
 * reason it is never used to build a path. Deciding which bytes get sent to an external model is
 * worth answering from the content rather than from a label attached to it.
 *
 * <p>The upload allowlist is wider than this ({@code xlsx}, {@code csv} and {@code docx} are
 * accepted as evidence), so a document extraction can legitimately fail here on a file the
 * platform was right to store.
 */
final class ExtractionMediaType {

    private static final byte[] PDF = {'%', 'P', 'D', 'F'};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};

    private ExtractionMediaType() {
    }

    static String sniff(byte[] content) {
        if (startsWith(content, PDF)) {
            return "application/pdf";
        }
        if (startsWith(content, PNG)) {
            return "image/png";
        }
        if (startsWith(content, JPEG)) {
            return "image/jpeg";
        }
        throw new ExtractionFailedException(
                "This file is not a document extraction can read. Only PDF, PNG and JPEG can be "
                        + "read; enter the values by hand instead.");
    }

    private static boolean startsWith(byte[] content, byte[] signature) {
        if (content.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (content[i] != signature[i]) {
                return false;
            }
        }
        return true;
    }
}
