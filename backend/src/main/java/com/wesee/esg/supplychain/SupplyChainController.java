/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.supplychain.dto.AllocateRequest;
import com.wesee.esg.supplychain.dto.PublishDisclosureRequest;
import com.wesee.esg.supplychain.dto.Scope3AllocationDto;
import com.wesee.esg.supplychain.dto.SharedDisclosureDto;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
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

/**
 * Both sides of the loop: what this company publishes to its buyers, and what it draws from its
 * suppliers. One screen, because a company is a buyer to its suppliers and a supplier to its
 * buyers, often on the same day.
 */
@RestController
@RequestMapping("/api/v1/supply-chain")
@Validated
public class SupplyChainController {

    private final SharedDisclosureService disclosureService;
    private final Scope3AllocationService allocationService;

    public SupplyChainController(SharedDisclosureService disclosureService,
                                 Scope3AllocationService allocationService) {
        this.disclosureService = disclosureService;
        this.allocationService = allocationService;
    }

    @GetMapping("/disclosures/mine")
    @PreAuthorize("@perm.check('supply_chain.view')")
    public List<SharedDisclosureDto> listMine() {
        return disclosureService.listMine();
    }

    @GetMapping("/disclosures/available")
    @PreAuthorize("@perm.check('supply_chain.view')")
    public List<SharedDisclosureDto> listAvailable() {
        return disclosureService.listAvailableToBuy();
    }

    @PostMapping("/links/{linkId}/publish")
    @PreAuthorize("@perm.check('supply_chain.manage')")
    public SharedDisclosureDto publish(@PathVariable UUID linkId,
                                       @Valid @RequestBody PublishDisclosureRequest request) {
        return disclosureService.publish(linkId, request);
    }

    @DeleteMapping("/disclosures/{disclosureId}")
    @PreAuthorize("@perm.check('supply_chain.manage')")
    public void revokeDisclosure(@PathVariable UUID disclosureId,
                                 @RequestParam(required = false) String reason) {
        disclosureService.revoke(disclosureId, reason);
    }

    @GetMapping("/allocations")
    @PreAuthorize("@perm.check('supply_chain.view')")
    public List<Scope3AllocationDto> listAllocations() {
        return allocationService.list();
    }

    @PostMapping("/disclosures/{disclosureId}/allocate")
    @PreAuthorize("@perm.check('supply_chain.manage')")
    public Scope3AllocationDto allocate(@PathVariable UUID disclosureId,
                                        @Valid @RequestBody AllocateRequest request) {
        return allocationService.allocate(disclosureId, request);
    }

    @DeleteMapping("/allocations/{allocationId}")
    @PreAuthorize("@perm.check('supply_chain.manage')")
    public void removeAllocation(@PathVariable UUID allocationId) {
        allocationService.remove(allocationId);
    }
}
