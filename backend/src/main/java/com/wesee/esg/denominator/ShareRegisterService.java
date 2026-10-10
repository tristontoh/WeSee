/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.denominator.dto.ShareCapitalDto;
import com.wesee.esg.denominator.dto.ShareholdingDto;
import com.wesee.esg.denominator.dto.UpsertShareCapitalRequest;
import com.wesee.esg.denominator.dto.UpsertShareholdingRequest;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ShareRegisterService {

    private final ShareCapitalRepository capitalRepository;
    private final ShareholdingRepository holdingRepository;
    private final CurrentUserProvider currentUserProvider;

    public ShareRegisterService(ShareCapitalRepository capitalRepository,
                                ShareholdingRepository holdingRepository,
                                CurrentUserProvider currentUserProvider) {
        this.capitalRepository = capitalRepository;
        this.holdingRepository = holdingRepository;
        this.currentUserProvider = currentUserProvider;
    }

    /** Null when nothing is recorded, so the form renders empty rather than erroring. */
    @Transactional(readOnly = true)
    public ShareCapitalDto getCapital(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        return capitalRepository.findByCompanyIdAndFiscalYear(companyId, fiscalYear)
                .map(ShareCapitalDto::from)
                .orElse(null);
    }

    @Transactional
    public ShareCapitalDto upsertCapital(int fiscalYear, UpsertShareCapitalRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        FigureValidator.requireSaneFiscalYear(fiscalYear);
        ShareCapitalValidator.validate(request.totalOutstandingShares(),
                request.publicHeldShares(), request.bumiputeraHeldShares());

        ShareCapital capital = capitalRepository.findByCompanyIdAndFiscalYear(companyId, fiscalYear)
                .orElseGet(() -> {
                    ShareCapital c = new ShareCapital();
                    c.setCompanyId(companyId);
                    c.setFiscalYear(fiscalYear);
                    return c;
                });
        capital.setTotalOutstandingShares(request.totalOutstandingShares());
        capital.setPublicHeldShares(request.publicHeldShares());
        capital.setBumiputeraHeldShares(request.bumiputeraHeldShares());
        return ShareCapitalDto.from(capitalRepository.save(capital));
    }

    @Transactional(readOnly = true)
    public List<ShareholdingDto> listHoldings(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        return holdingRepository.findByCompanyIdAndFiscalYearOrderBySharesHeldDesc(companyId, fiscalYear)
                .stream().map(ShareholdingDto::from).toList();
    }

    /** Returns every holder when fewer than {@code limit} exist, rather than padding the list. */
    @Transactional(readOnly = true)
    public List<ShareholdingDto> topHoldings(int fiscalYear, int limit) {
        return listHoldings(fiscalYear).stream().limit(Math.max(0, limit)).toList();
    }

    @Transactional
    public ShareholdingDto upsertHolding(UUID holdingId, int fiscalYear, UpsertShareholdingRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        FigureValidator.requireSaneFiscalYear(fiscalYear);
        ShareCapitalValidator.requireHoldingWithinCapital(
                request.holderName(), request.sharesHeld(),
                capitalRepository.findByCompanyIdAndFiscalYear(companyId, fiscalYear)
                        .map(ShareCapital::getTotalOutstandingShares)
                        .orElse(null));

        Shareholding holding = holdingId == null
                ? new Shareholding()
                : holdingRepository.findByIdAndCompanyId(holdingId, companyId)
                        .orElseThrow(() -> new NotFoundException("No such shareholding"));
        holding.setCompanyId(companyId);
        holding.setFiscalYear(fiscalYear);
        holding.setHolderName(request.holderName());
        holding.setSharesHeld(request.sharesHeld());
        return ShareholdingDto.from(holdingRepository.save(holding));
    }

    @Transactional
    public void deleteHolding(UUID holdingId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Shareholding holding = holdingRepository.findByIdAndCompanyId(holdingId, companyId)
                .orElseThrow(() -> new NotFoundException("No such shareholding"));
        holdingRepository.delete(holding);
    }
}
