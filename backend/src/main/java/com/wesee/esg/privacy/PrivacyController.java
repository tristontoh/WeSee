package com.wesee.esg.privacy;

import com.wesee.esg.privacy.dto.CloseAccountRequest;
import com.wesee.esg.privacy.dto.CompanyDataExportResponse;
import com.wesee.esg.privacy.dto.PrivacyConsentResponse;
import com.wesee.esg.privacy.dto.UpdatePrivacyConsentRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/privacy")
@PreAuthorize("hasRole('COMPANY_ADMIN')")
public class PrivacyController {

    private final PrivacyService privacyService;

    public PrivacyController(PrivacyService privacyService) {
        this.privacyService = privacyService;
    }

    @GetMapping("/consent")
    public PrivacyConsentResponse getConsent() {
        return privacyService.getConsent();
    }

    @PatchMapping("/consent")
    public PrivacyConsentResponse updateConsent(@Valid @RequestBody UpdatePrivacyConsentRequest request) {
        return privacyService.updateConsent(request);
    }

    @GetMapping("/data-export")
    public CompanyDataExportResponse exportData() {
        return privacyService.exportData();
    }

    @PostMapping("/close-account")
    public ResponseEntity<Void> closeAccount(@Valid @RequestBody CloseAccountRequest request) {
        privacyService.closeAccount(request);
        return ResponseEntity.noContent().build();
    }
}
