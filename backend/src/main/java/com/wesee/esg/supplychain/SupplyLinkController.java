/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.supplychain.dto.InviteSupplierRequest;
import com.wesee.esg.supplychain.dto.SupplyLinkDto;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/supply-chain/links")
@Validated
public class SupplyLinkController {

    private final SupplyLinkService supplyLinkService;

    public SupplyLinkController(SupplyLinkService supplyLinkService) {
        this.supplyLinkService = supplyLinkService;
    }

    @GetMapping("/as-buyer")
    @PreAuthorize("@perm.check('supply_chain.view')")
    public List<SupplyLinkDto> listAsBuyer() {
        return supplyLinkService.listAsBuyer();
    }

    @GetMapping("/as-supplier")
    @PreAuthorize("@perm.check('supply_chain.view')")
    public List<SupplyLinkDto> listAsSupplier() {
        return supplyLinkService.listAsSupplier();
    }

    @PostMapping("/invite")
    @PreAuthorize("@perm.check('supply_chain.manage')")
    public SupplyLinkDto invite(@Valid @RequestBody InviteSupplierRequest request) {
        return supplyLinkService.invite(request);
    }

    /**
     * Accept and decline check no supply-chain permission: they are reached by a supplier who is
     * not linked yet, so requiring a permission they could only have been granted after linking
     * would make the invitation unanswerable. They still require authentication, and the token is
     * the authorisation.
     */
    @PostMapping("/accept/{token}")
    public SupplyLinkDto accept(@PathVariable String token) {
        return supplyLinkService.accept(token);
    }

    @PostMapping("/decline/{token}")
    public void decline(@PathVariable String token) {
        supplyLinkService.decline(token);
    }

    @DeleteMapping("/{linkId}")
    @PreAuthorize("@perm.check('supply_chain.manage')")
    public void revoke(@PathVariable UUID linkId) {
        supplyLinkService.revoke(linkId);
    }
}
