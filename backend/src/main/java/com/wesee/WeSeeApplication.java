package com.wesee;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * WeSee backend — Spring Boot port of the FastAPI gateway.
 * Exposes the same endpoints the Angular frontend calls: /auth/login, /dashboard/carbon,
 * /carbon/ingest. Runs on :8000 with `mvn spring-boot:run`.
 */
@SpringBootApplication
public class WeSeeApplication {
    public static void main(String[] args) {
        SpringApplication.run(WeSeeApplication.class, args);
    }
}
