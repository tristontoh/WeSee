package com.wesee.esg.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.util.List;

/**
 * Serves the built client, and hands any unknown path back to it.
 *
 * The router puts real paths in the address bar rather than hiding them behind a "#", so a browser
 * asking for /dashboard asks this server for /dashboard — a path with no file behind it. Without
 * this the request falls through to security and comes back 403, which is what a reload or a
 * pasted deep link would have produced in production while working perfectly under the dev server,
 * because Vite does this fallback itself.
 *
 * API prefixes are excluded deliberately: a mistyped endpoint must keep answering 404, not hand a
 * caller the HTML shell for it to try to parse as JSON.
 */
@Configuration
public class SpaResourceConfig implements WebMvcConfigurer {

    private static final List<String> NOT_THE_APP = List.of("api/", "actuator/", "v3/", "swagger-ui/");

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String path, Resource location) throws IOException {
                        Resource asked = location.createRelative(path);
                        if (asked.exists() && asked.isReadable()) {
                            return asked;
                        }
                        if (NOT_THE_APP.stream().anyMatch(path::startsWith)) {
                            return null;
                        }
                        // No shell to hand back — the client has not been built into this jar.
                        // Returning the missing resource anyway turns every unknown path into a
                        // 500, which reads as a server fault rather than the plain 404 it is.
                        Resource shell = new ClassPathResource("/static/index.html");
                        return shell.exists() ? shell : null;
                    }
                });
    }
}
