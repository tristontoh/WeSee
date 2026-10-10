/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.denominator.dto.ShareCapitalDto;
import com.wesee.esg.denominator.dto.ShareholdingDto;
import com.wesee.esg.denominator.dto.UpsertShareCapitalRequest;
import com.wesee.esg.denominator.dto.UpsertShareholdingRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/denominators/shares")
@Validated
public class ShareRegisterController {

    private final ShareRegisterService shareRegisterService;

    public ShareRegisterController(ShareRegisterService shareRegisterService) {
        this.shareRegisterService = shareRegisterService;
    }

    @GetMapping("/capital/{fiscalYear}")
    @PreAuthorize("@perm.check('indicators.view')")
    public ShareCapitalDto getCapital(@PathVariable int fiscalYear) {
        return shareRegisterService.getCapital(fiscalYear);
    }

    @PutMapping("/capital/{fiscalYear}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public ShareCapitalDto upsertCapital(@PathVariable int fiscalYear,
                                         @Valid @RequestBody UpsertShareCapitalRequest request) {
        return shareRegisterService.upsertCapital(fiscalYear, request);
    }

    @GetMapping("/holdings/{fiscalYear}")
    @PreAuthorize("@perm.check('indicators.view')")
    public List<ShareholdingDto> listHoldings(@PathVariable int fiscalYear) {
        return shareRegisterService.listHoldings(fiscalYear);
    }

    @GetMapping("/holdings/{fiscalYear}/top/{limit}")
    @PreAuthorize("@perm.check('indicators.view')")
    public List<ShareholdingDto> topHoldings(@PathVariable int fiscalYear,
                                             @PathVariable @Min(1) @Max(100) int limit) {
        return shareRegisterService.topHoldings(fiscalYear, limit);
    }

    @PostMapping("/holdings/{fiscalYear}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public ShareholdingDto addHolding(@PathVariable int fiscalYear,
                                      @Valid @RequestBody UpsertShareholdingRequest request) {
        return shareRegisterService.upsertHolding(null, fiscalYear, request);
    }

    @PutMapping("/holdings/{fiscalYear}/{holdingId}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public ShareholdingDto updateHolding(@PathVariable int fiscalYear,
                                         @PathVariable UUID holdingId,
                                         @Valid @RequestBody UpsertShareholdingRequest request) {
        return shareRegisterService.upsertHolding(holdingId, fiscalYear, request);
    }

    @DeleteMapping("/holdings/{holdingId}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public void deleteHolding(@PathVariable UUID holdingId) {
        shareRegisterService.deleteHolding(holdingId);
    }
}
