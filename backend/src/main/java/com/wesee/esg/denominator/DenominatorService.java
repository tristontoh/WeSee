/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.denominator.dto.AnnualFigureDto;
import com.wesee.esg.denominator.dto.FigureCatalogueEntryDto;
import com.wesee.esg.denominator.dto.SetAnnualFigureRequest;
import com.wesee.esg.indicators.derivation.DerivationService;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * The per-fiscal-year figures the ratio indicators divide by. Nothing here computes a ratio — this
 * layer only holds what the formulas were missing.
 */
@Service
public class DenominatorService {

    private final CompanyAnnualFigureRepository figureRepository;
    private final CurrentUserProvider currentUserProvider;
    private final DerivationService derivationService;

    public DenominatorService(CompanyAnnualFigureRepository figureRepository,
                              CurrentUserProvider currentUserProvider,
                              DerivationService derivationService) {
        this.figureRepository = figureRepository;
        this.currentUserProvider = currentUserProvider;
        this.derivationService = derivationService;
    }

    /** The form's shape, straight off the enum, so the screen cannot drift from the catalogue. */
    public List<FigureCatalogueEntryDto> catalogue() {
        return Arrays.stream(AnnualFigureKey.values())
                .map(k -> FigureCatalogueEntryDto.from(k, FigureValidator.isWholeNumber(k)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AnnualFigureDto> listFigures(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        return figureRepository.findByCompanyIdAndFiscalYear(companyId, fiscalYear).stream()
                .sorted(Comparator.comparingInt(f -> f.getFigureKey().ordinal()))
                .map(AnnualFigureDto::from)
                .toList();
    }

    @Transactional
    public AnnualFigureDto setFigure(AnnualFigureKey figureKey, int fiscalYear, SetAnnualFigureRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        FigureValidator.validate(figureKey, request.value(), fiscalYear);

        CompanyAnnualFigure figure = figureRepository
                .findByCompanyIdAndFiscalYearAndFigureKey(companyId, fiscalYear, figureKey)
                .orElseGet(() -> {
                    CompanyAnnualFigure f = new CompanyAnnualFigure();
                    f.setCompanyId(companyId);
                    f.setFiscalYear(fiscalYear);
                    f.setFigureKey(figureKey);
                    return f;
                });
        figure.setValue(request.value());
        figure.setUnit(figureKey.canonicalUnit());
        // Only overwrite the note when one was actually sent. The screen does not carry the field,
        // so an unconditional set erased a note entered through the API the next time anyone
        // edited the figure's value — the column the spec justifies as the figure's provenance,
        // silently clearing itself.
        if (request.sourceNote() != null) {
            figure.setSourceNote(request.sourceNote());
        }
        AnnualFigureDto saved = AnnualFigureDto.from(figureRepository.save(figure));
        // In the same transaction: a denominator that moved must move what divides by it, or the
        // screen shows a stale ratio beside its own fresh input.
        derivationService.recomputeAllDependents(companyId, fiscalYear);
        return saved;
    }

    @Transactional
    public void deleteFigure(AnnualFigureKey figureKey, int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        CompanyAnnualFigure figure = figureRepository
                .findByCompanyIdAndFiscalYearAndFigureKey(companyId, fiscalYear, figureKey)
                .orElseThrow(() -> new NotFoundException(
                        figureKey.label() + " has no value recorded for FY" + fiscalYear));
        figureRepository.delete(figure);
        derivationService.recomputeAllDependents(companyId, fiscalYear);
    }
}
