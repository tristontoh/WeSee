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

/** Token lifecycle management — issuing a credential that can write company data is admin-only. */
@RestController
@RequestMapping("/api/v1/api-tokens")
@PreAuthorize("hasRole('COMPANY_ADMIN')")
public class ApiTokenController {

    private final ApiTokenService apiTokenService;

    public ApiTokenController(ApiTokenService apiTokenService) {
        this.apiTokenService = apiTokenService;
    }

    @GetMapping
    public List<ApiTokenResponse> list() {
        return apiTokenService.list();
    }

    @PostMapping
    public CreateApiTokenResponse create(@Valid @RequestBody CreateApiTokenRequest request) {
        return apiTokenService.create(request);
    }

    @DeleteMapping("/{id}")
    public void revoke(@PathVariable UUID id) {
        apiTokenService.revoke(id);
    }
}
