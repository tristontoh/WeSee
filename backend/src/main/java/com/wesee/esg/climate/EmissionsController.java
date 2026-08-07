package com.wesee.esg.climate;

import com.wesee.esg.climate.dto.CreateScope3CategoryRequest;
import com.wesee.esg.climate.dto.EmissionsResponse;
import com.wesee.esg.climate.dto.Scope3CategoryResponse;
import com.wesee.esg.climate.dto.SetEmissionValueRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/climate/emissions")
@PreAuthorize("@planGate.check('climate-module')")
public class EmissionsController {

    private final EmissionsService emissionsService;

    public EmissionsController(EmissionsService emissionsService) {
        this.emissionsService = emissionsService;
    }

    @GetMapping
    public EmissionsResponse get() {
        return emissionsService.getEmissions();
    }

    @PutMapping("/scope1/{fiscalYear}")
    public EmissionsResponse setScope1(@PathVariable int fiscalYear, @Valid @RequestBody SetEmissionValueRequest request) {
        return emissionsService.setScopeValue(EmissionScope.SCOPE_1, fiscalYear, request);
    }

    @PutMapping("/scope2/{fiscalYear}")
    public EmissionsResponse setScope2(@PathVariable int fiscalYear, @Valid @RequestBody SetEmissionValueRequest request) {
        return emissionsService.setScopeValue(EmissionScope.SCOPE_2, fiscalYear, request);
    }

    @PostMapping("/scope3/categories")
    public ResponseEntity<Scope3CategoryResponse> createCategory(@Valid @RequestBody CreateScope3CategoryRequest request) {
        return ResponseEntity.ok(emissionsService.createScope3Category(request));
    }

    @PutMapping("/scope3/categories/{categoryId}/values/{fiscalYear}")
    public EmissionsResponse setScope3Value(@PathVariable UUID categoryId, @PathVariable int fiscalYear, @Valid @RequestBody SetEmissionValueRequest request) {
        return emissionsService.setScope3Value(categoryId, fiscalYear, request);
    }

    @DeleteMapping("/scope3/categories/{categoryId}")
    public ResponseEntity<Void> deleteScope3Category(@PathVariable UUID categoryId) {
        emissionsService.deleteScope3Category(categoryId);
        return ResponseEntity.noContent().build();
    }
}
