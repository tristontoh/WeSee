package com.wesee.esg.platform;

import com.wesee.esg.email.dto.TestEmailResponse;
import com.wesee.esg.platform.dto.PlatformSettingsResponse;
import com.wesee.esg.platform.dto.UpdatePlatformSettingsRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/platform-settings")
@PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'SUPERADMIN')")
public class PlatformSettingsController {

    private final PlatformSettingsService service;

    public PlatformSettingsController(PlatformSettingsService service) {
        this.service = service;
    }

    @GetMapping
    public PlatformSettingsResponse get() {
        return service.get();
    }

    @PutMapping
    public PlatformSettingsResponse update(@Valid @RequestBody UpdatePlatformSettingsRequest request) {
        return service.update(request);
    }

    @PostMapping("/test")
    public TestEmailResponse sendTest() {
        return service.sendTest();
    }
}
