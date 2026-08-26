package com.wesee.esg.ai;

import com.wesee.esg.ai.dto.AiProviderConfigResponse;
import com.wesee.esg.ai.dto.TestAiConnectionResponse;
import com.wesee.esg.ai.dto.UpdateAiProviderConfigRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/company/ai/settings")
public class AiProviderConfigController {

    private final AiProviderConfigService service;

    public AiProviderConfigController(AiProviderConfigService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("@perm.check('ai.view') or @perm.check('ai.manage')")
    public AiProviderConfigResponse get() {
        return service.get();
    }

    @PutMapping
    @PreAuthorize("@perm.check('ai.manage')")
    public AiProviderConfigResponse update(@Valid @RequestBody UpdateAiProviderConfigRequest request) {
        return service.update(request);
    }

    @PostMapping("/test")
    @PreAuthorize("@perm.check('ai.manage')")
    public TestAiConnectionResponse test() {
        return service.testConnection();
    }
}
