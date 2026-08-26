package com.wesee.esg.apiaccess;

import com.wesee.esg.apiaccess.dto.ApiTokenResponse;
import com.wesee.esg.apiaccess.dto.CreateApiTokenRequest;
import com.wesee.esg.apiaccess.dto.CreateApiTokenResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Token lifecycle management. Listing is view-level; issuing/revoking a credential that can
 * write company data requires the manage permission. Previously the whole controller was
 * admin-only even for GET, a pre-existing mismatch with the frontend route (which let any
 * tenant role reach the page) — this split finally resolves it properly.
 */
@RestController
@RequestMapping("/api/v1/api-tokens")
public class ApiTokenController {

    private final ApiTokenService apiTokenService;

    public ApiTokenController(ApiTokenService apiTokenService) {
        this.apiTokenService = apiTokenService;
    }

    @GetMapping
    @PreAuthorize("@perm.check('api_access.view') or @perm.check('api_access.manage')")
    public List<ApiTokenResponse> list() {
        return apiTokenService.list();
    }

    @PostMapping
    @PreAuthorize("@perm.check('api_access.manage')")
    public CreateApiTokenResponse create(@Valid @RequestBody CreateApiTokenRequest request) {
        return apiTokenService.create(request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.check('api_access.manage')")
    public void revoke(@PathVariable UUID id) {
        apiTokenService.revoke(id);
    }
}
