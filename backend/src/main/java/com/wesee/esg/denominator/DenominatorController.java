/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.denominator.dto.AnnualFigureDto;
import com.wesee.esg.denominator.dto.FigureCatalogueEntryDto;
import com.wesee.esg.denominator.dto.SetAnnualFigureRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The denominators the ratio indicators divide by. These are indicator inputs, so they sit behind
 * the indicator permissions rather than a set of their own.
 */
@RestController
@RequestMapping("/api/v1/denominators")
@Validated
public class DenominatorController {

    private final DenominatorService denominatorService;

    public DenominatorController(DenominatorService denominatorService) {
        this.denominatorService = denominatorService;
    }

    @GetMapping("/catalogue")
    @PreAuthorize("@perm.check('indicators.view')")
    public List<FigureCatalogueEntryDto> catalogue() {
        return denominatorService.catalogue();
    }

    @GetMapping("/figures/{fiscalYear}")
    @PreAuthorize("@perm.check('indicators.view')")
    public List<AnnualFigureDto> listFigures(@PathVariable int fiscalYear) {
        return denominatorService.listFigures(fiscalYear);
    }

    /** Idempotent per (year, key): entering a figure twice corrects it rather than duplicating it. */
    @PutMapping("/figures/{fiscalYear}/{figureKey}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public AnnualFigureDto setFigure(@PathVariable int fiscalYear,
                                     @PathVariable AnnualFigureKey figureKey,
                                     @Valid @RequestBody SetAnnualFigureRequest request) {
        return denominatorService.setFigure(figureKey, fiscalYear, request);
    }

    @DeleteMapping("/figures/{fiscalYear}/{figureKey}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public void deleteFigure(@PathVariable int fiscalYear, @PathVariable AnnualFigureKey figureKey) {
        denominatorService.deleteFigure(figureKey, fiscalYear);
    }
}
