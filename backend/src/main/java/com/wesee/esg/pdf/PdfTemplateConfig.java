/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.pdf;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

/**
 * A separate {@link TemplateEngine} from Spring MVC's auto-configured web one — this one is
 * dedicated to PDF templates, resolved from {@code templates/pdf/}. Thymeleaf 3.1's HTML mode
 * always enforces well-formed, XML-compliant markup (no separate XHTML mode needed), which is
 * exactly what openhtmltopdf requires as input.
 */
@Configuration
public class PdfTemplateConfig {

    @Bean
    public TemplateEngine pdfTemplateEngine() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/pdf/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(true);

        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        return engine;
    }
}
