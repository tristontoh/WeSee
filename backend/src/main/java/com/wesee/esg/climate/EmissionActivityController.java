package com.wesee.esg.climate;

import com.wesee.esg.climate.dto.AddActivityEntryRequest;
import com.wesee.esg.climate.dto.EmissionActivityEntryResponse;
import com.wesee.esg.climate.dto.EmissionFactorResponse;
import com.wesee.esg.climate.dto.EmissionsResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/climate/activity")
public class EmissionActivityController {

    private final EmissionActivityService emissionActivityService;

    public EmissionActivityController(EmissionActivityService emissionActivityService) {
        this.emissionActivityService = emissionActivityService;
    }

    @GetMapping("/factors")
    public List<EmissionFactorResponse> listFactors() {
        return emissionActivityService.listFactors();
    }

    @GetMapping("/entries")
    public List<EmissionActivityEntryResponse> listEntries(@RequestParam int fiscalYear) {
        return emissionActivityService.listEntries(fiscalYear);
    }

    @PostMapping("/entries")
    public EmissionActivityEntryResponse addEntry(@Valid @RequestBody AddActivityEntryRequest request) {
        return emissionActivityService.addEntry(request.fiscalYear(), request.factorId(), request.quantity());
    }

    @DeleteMapping("/entries/{id}")
    public void deleteEntry(@PathVariable UUID id) {
        emissionActivityService.deleteEntry(id);
    }

    @PostMapping("/entries/apply")
    public EmissionsResponse applyToScope(@RequestParam int fiscalYear, @RequestParam EmissionScope scope) {
        return emissionActivityService.applyToScope(fiscalYear, scope);
    }
}
