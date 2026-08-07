package com.wesee.esg.email;

import com.wesee.esg.email.dto.EmailSettingsResponse;
import com.wesee.esg.email.dto.TestEmailResponse;
import com.wesee.esg.email.dto.UpdateEmailSettingsRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/company/email-settings")
@PreAuthorize("hasRole('COMPANY_ADMIN')")
public class CompanyEmailSettingsController {

    private final CompanyEmailSettingsService service;

    public CompanyEmailSettingsController(CompanyEmailSettingsService service) {
        this.service = service;
    }

    @GetMapping
    public EmailSettingsResponse get() {
        return service.get();
    }

    @PutMapping
    public EmailSettingsResponse update(@Valid @RequestBody UpdateEmailSettingsRequest request) {
        return service.update(request);
    }

    @PostMapping("/test")
    public TestEmailResponse sendTest() {
        return service.sendTest();
    }
}
