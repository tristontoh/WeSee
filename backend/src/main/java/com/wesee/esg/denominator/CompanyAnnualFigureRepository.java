/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyAnnualFigureRepository extends JpaRepository<CompanyAnnualFigure, UUID> {

    List<CompanyAnnualFigure> findByCompanyIdAndFiscalYear(UUID companyId, Integer fiscalYear);

    Optional<CompanyAnnualFigure> findByCompanyIdAndFiscalYearAndFigureKey(
            UUID companyId, Integer fiscalYear, AnnualFigureKey figureKey);

    List<CompanyAnnualFigure> findByCompanyIdOrderByFiscalYearAsc(UUID companyId);
}
