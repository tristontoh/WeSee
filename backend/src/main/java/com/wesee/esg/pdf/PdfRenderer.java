/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.pdf;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;

/** Renders a Thymeleaf template (XHTML mode) into a PDF byte array, for server-generated report downloads. */
@Component
public class PdfRenderer {

    private final TemplateEngine pdfTemplateEngine;

    public PdfRenderer(TemplateEngine pdfTemplateEngine) {
        this.pdfTemplateEngine = pdfTemplateEngine;
    }

    public byte[] render(String templateName, Context context) {
        String xhtml = pdfTemplateEngine.process(templateName, context);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(xhtml, null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to render PDF for template " + templateName, e);
        }
    }
}
