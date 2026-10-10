/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.email.EmailService;
import com.wesee.esg.platform.PlatformSettingsService;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.supplychain.dto.InviteSupplierRequest;
import com.wesee.esg.supplychain.dto.SupplyLinkDto;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Inviting a supplier, and the supplier accepting. The one line that separates this from
 * {@code TeamInvite}: a team invite lands the new user inside the inviting company, a supply
 * invite leaves the supplier in its own.
 */
@Service
public class SupplyLinkService {

    private static final int INVITE_VALIDITY_DAYS = 14;

    private final SupplyLinkRepository supplyLinkRepository;
    private final AppUserRepository appUserRepository;
    private final CompanyRepository companyRepository;
    private final EmailService emailService;
    private final PlatformSettingsService platformSettingsService;
    private final CurrentUserProvider currentUserProvider;
    private final SecureRandom random = new SecureRandom();

    public SupplyLinkService(SupplyLinkRepository supplyLinkRepository,
                             AppUserRepository appUserRepository,
                             CompanyRepository companyRepository,
                             EmailService emailService,
                             PlatformSettingsService platformSettingsService,
                             CurrentUserProvider currentUserProvider) {
        this.supplyLinkRepository = supplyLinkRepository;
        this.appUserRepository = appUserRepository;
        this.companyRepository = companyRepository;
        this.emailService = emailService;
        this.platformSettingsService = platformSettingsService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public List<SupplyLinkDto> listAsBuyer() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return supplyLinkRepository.findByBuyerCompanyIdOrderByInvitedAtDesc(companyId).stream()
                .map(l -> SupplyLinkDto.asBuyer(l, companyName(l.getSupplierCompanyId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SupplyLinkDto> listAsSupplier() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return supplyLinkRepository.findBySupplierCompanyIdOrderByInvitedAtDesc(companyId).stream()
                .map(l -> SupplyLinkDto.asSupplier(l, companyName(l.getBuyerCompanyId())))
                .toList();
    }

    @Transactional
    public SupplyLinkDto invite(InviteSupplierRequest request) {
        UUID buyerCompanyId = currentUserProvider.requireCompanyId();
        String email = request.supplierEmail().trim().toLowerCase();

        UUID emailOwnerCompanyId = appUserRepository.findByEmailIgnoreCase(email)
                .map(AppUser::getCompany)
                .map(Company::getId)
                .orElse(null);
        InviteGuard.requireInvitable(buyerCompanyId, emailOwnerCompanyId);

        if (emailOwnerCompanyId != null && supplyLinkRepository
                .existsByBuyerCompanyIdAndSupplierCompanyIdAndStatus(
                        buyerCompanyId, emailOwnerCompanyId, SupplyLinkStatus.ACTIVE)) {
            throw new ConflictException("You already have a live link with that supplier");
        }

        AppUser inviter = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        Company buyer = companyRepository.findById(buyerCompanyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));

        String rawToken = generateToken();
        SupplyLink link = new SupplyLink();
        link.setBuyerCompanyId(buyerCompanyId);
        link.setSupplierEmail(email);
        link.setSupplierName(request.supplierName());
        link.setStatus(SupplyLinkStatus.PENDING);
        // Only the digest is stored. Unlike TeamInvite, which keeps its token in plain text, this
        // one unlocks another company's carbon figures — a database read should not be enough to
        // accept an invitation that was never received.
        link.setInviteTokenHash(sha256Hex(rawToken));
        link.setInvitedByUserId(inviter.getId());
        link.setInvitedByName(inviter.getName());
        link.setInvitedAt(Instant.now());
        link.setExpiresAt(Instant.now().plus(INVITE_VALIDITY_DAYS, ChronoUnit.DAYS));
        link = supplyLinkRepository.save(link);

        String url = platformSettingsService.getEffectiveAppBaseUrl()
                + "/accept-supply-invite?token=" + rawToken;
        emailService.sendInviteEmail(buyerCompanyId, email,
                request.supplierName() != null ? request.supplierName() : email,
                buyer.getName(), inviter.getName(), "SUPPLIER", url);

        return SupplyLinkDto.asBuyer(link, null);
    }

    /**
     * The supplier registers its own company through ordinary registration and then accepts. The
     * invite deliberately does not create a company: a supplier whose figures lived inside its
     * buyer's tenant would be reporting into the buyer's own ledger.
     */
    @Transactional
    public SupplyLinkDto accept(String rawToken) {
        UUID acceptingCompanyId = currentUserProvider.requireCompanyId();
        SupplyLink link = requireLinkByToken(rawToken);
        InviteGuard.requireAcceptable(link, Instant.now());
        InviteGuard.requireAcceptingCompanyIsNotTheBuyer(link, acceptingCompanyId);

        if (supplyLinkRepository.existsByBuyerCompanyIdAndSupplierCompanyIdAndStatus(
                link.getBuyerCompanyId(), acceptingCompanyId, SupplyLinkStatus.ACTIVE)) {
            throw new ConflictException("You already have a live link with that buyer");
        }

        link.setSupplierCompanyId(acceptingCompanyId);
        link.setStatus(SupplyLinkStatus.ACTIVE);
        link.setRespondedAt(Instant.now());
        return SupplyLinkDto.asSupplier(supplyLinkRepository.save(link),
                companyName(link.getBuyerCompanyId()));
    }

    @Transactional
    public void decline(String rawToken) {
        SupplyLink link = requireLinkByToken(rawToken);
        InviteGuard.requireAcceptable(link, Instant.now());
        link.setStatus(SupplyLinkStatus.DECLINED);
        link.setRespondedAt(Instant.now());
        supplyLinkRepository.save(link);
    }

    /** Sets a flag; never deletes. A buyer must be able to see that a link was withdrawn. */
    @Transactional
    public void revoke(UUID linkId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        SupplyLink link = supplyLinkRepository.findByIdAndBuyerCompanyId(linkId, companyId)
                .or(() -> supplyLinkRepository.findByIdAndSupplierCompanyId(linkId, companyId))
                .orElseThrow(() -> new NotFoundException("No such supply link"));
        link.setStatus(SupplyLinkStatus.REVOKED);
        link.setRespondedAt(Instant.now());
        supplyLinkRepository.save(link);
    }

    private SupplyLink requireLinkByToken(String rawToken) {
        return supplyLinkRepository.findByInviteTokenHash(sha256Hex(rawToken))
                .orElseThrow(() -> new NotFoundException("That invitation link is not valid"));
    }

    private String companyName(UUID companyId) {
        return companyId == null ? null
                : companyRepository.findById(companyId).map(Company::getName).orElse(null);
    }

    private String generateToken() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256Hex(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by the JVM spec", e);
        }
    }

    Optional<SupplyLink> findActiveLinkAsSupplier(UUID supplierCompanyId, UUID linkId) {
        return supplyLinkRepository.findByIdAndSupplierCompanyId(linkId, supplierCompanyId)
                .filter(l -> l.getStatus() == SupplyLinkStatus.ACTIVE);
    }
}
