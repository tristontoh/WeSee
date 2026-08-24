package com.wesee.esg.assurance;

import com.wesee.esg.assurance.dto.CreateSignOffRequest;
import com.wesee.esg.assurance.dto.RevokeSignOffRequest;
import com.wesee.esg.assurance.dto.SignOffAuditEntryResponse;
import com.wesee.esg.assurance.dto.SignOffResponse;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.indicators.IndicatorValue;
import com.wesee.esg.indicators.IndicatorValueRepository;
import com.wesee.esg.reference.IndicatorDefinition;
import com.wesee.esg.reference.IndicatorDefinitionRepository;
import com.wesee.esg.reference.MatterSetResolverService;
import com.wesee.esg.reference.SustainabilityMatter;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.tenant.CompanySizeBand;
import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AssuranceService {

    private final SignOffRecordRepository signOffRepository;
    private final SignOffAuditEntryRepository auditRepository;
    private final IndicatorDefinitionRepository indicatorDefinitionRepository;
    private final IndicatorValueRepository indicatorValueRepository;
    private final MatterSetResolverService matterSetResolverService;
    private final CurrentUserProvider currentUserProvider;
    private final CompanyRepository companyRepository;
    private final AppUserRepository appUserRepository;

    public AssuranceService(SignOffRecordRepository signOffRepository,
                             SignOffAuditEntryRepository auditRepository,
                             IndicatorDefinitionRepository indicatorDefinitionRepository,
                             IndicatorValueRepository indicatorValueRepository,
                             MatterSetResolverService matterSetResolverService,
                             CurrentUserProvider currentUserProvider,
                             CompanyRepository companyRepository,
                             AppUserRepository appUserRepository) {
        this.signOffRepository = signOffRepository;
        this.auditRepository = auditRepository;
        this.indicatorDefinitionRepository = indicatorDefinitionRepository;
        this.indicatorValueRepository = indicatorValueRepository;
        this.matterSetResolverService = matterSetResolverService;
        this.currentUserProvider = currentUserProvider;
        this.companyRepository = companyRepository;
        this.appUserRepository = appUserRepository;
    }

    @Transactional(readOnly = true)
    public List<SignOffResponse> list() {
        UUID companyId = currentUserProvider.requireCompanyId();
        LocalDate deadline = mandatoryExternalAssuranceDeadline(companyId);
        return signOffRepository.findByCompanyIdOrderByFiscalYearDesc(companyId).stream()
                .map(r -> SignOffResponse.from(r, deadline))
                .toList();
    }

    @Transactional(readOnly = true)
    public SignOffResponse get(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        LocalDate deadline = mandatoryExternalAssuranceDeadline(companyId);
        return signOffRepository.findByCompanyIdAndFiscalYear(companyId, fiscalYear)
                .map(r -> SignOffResponse.from(r, deadline))
                .orElseThrow(() -> new NotFoundException("No sign-off record for fiscal year " + fiscalYear));
    }

    /**
     * Real Bursa phase-in schedule for mandatory reasonable assurance over Scope 1/2 emissions:
     * Main Market issuers >= RM2bn market cap from Jan 2027, remaining Main Market from Jan 2028,
     * ACE Market from Jan 2029. Exact market cap isn't tracked, so sizeBand (LARGE) is used as the
     * closest available proxy for the >= RM2bn threshold. Returns null for SME (not yet mandated).
     */
    private LocalDate mandatoryExternalAssuranceDeadline(UUID companyId) {
        Company company = companyRepository.findById(companyId).orElseThrow(() -> new NotFoundException("Company not found"));
        MarketClassification market = company.getMarketClassification();
        if (market == MarketClassification.MAIN_MARKET) {
            return company.getSizeBand() == CompanySizeBand.LARGE ? LocalDate.of(2027, 1, 1) : LocalDate.of(2028, 1, 1);
        }
        if (market == MarketClassification.ACE_MARKET) {
            return LocalDate.of(2029, 1, 1);
        }
        return null;
    }

    @Transactional(readOnly = true)
    public int completionPercent(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Company company = companyRepository.findById(companyId).orElseThrow(() -> new NotFoundException("Company not found"));

        List<String> matterIds = matterSetResolverService.resolveApplicableMatters(company).stream()
                .map(SustainabilityMatter::getId).toList();
        List<IndicatorDefinition> defs = indicatorDefinitionRepository.findByMatterIdInOrderByCategoryAscNameAsc(matterIds);
        if (defs.isEmpty()) {
            return 100;
        }
        Set<String> filledDefIds = indicatorValueRepository.findByCompanyIdAndIndicatorDefinitionIdInOrderByFiscalYearAsc(
                        companyId, defs.stream().map(IndicatorDefinition::getId).toList()).stream()
                .filter(v -> v.getFiscalYear() == fiscalYear && v.getValue() != null)
                .map(v -> v.getIndicatorDefinition().getId())
                .collect(java.util.stream.Collectors.toSet());
        return (int) Math.round(100.0 * filledDefIds.size() / defs.size());
    }

    @Transactional
    public SignOffResponse signOff(int fiscalYear, CreateSignOffRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();

        int completion = completionPercent(fiscalYear);
        if (completion < 100) {
            throw new ConflictException("Cannot sign off: only " + completion + "% of indicators are complete for fiscal year " + fiscalYear);
        }

        SignOffRecord record = signOffRepository.findByCompanyIdAndFiscalYear(companyId, fiscalYear)
                .orElseGet(() -> {
                    SignOffRecord r = new SignOffRecord();
                    r.setCompanyId(companyId);
                    r.setFiscalYear(fiscalYear);
                    return r;
                });

        Instant signedAt = Instant.now();
        String hash = generateHash(companyId, fiscalYear, request, signedAt);
        record.setStatus(SignOffStatus.SIGNED);
        record.setSignerName(request.signerName());
        record.setSignerTitle(request.signerTitle());
        record.setNotes(request.notes());
        record.setHash(hash);
        record.setSignedAt(signedAt);
        record.setRevokedAt(null);
        record.setRevokedBy(null);
        record.setRevocationReason(null);
        record.setAssuranceLevel(request.assuranceLevel() != null && !request.assuranceLevel().isBlank()
                ? AssuranceLevel.valueOf(request.assuranceLevel()) : AssuranceLevel.INTERNAL_REVIEW);
        record.setExternalAssurerName(request.externalAssurerName());
        record.setStandardReferenced(request.standardReferenced());
        signOffRepository.save(record);

        SignOffAuditEntry entry = new SignOffAuditEntry();
        entry.setCompanyId(companyId);
        entry.setFiscalYear(fiscalYear);
        entry.setAction(SignOffStatus.SIGNED);
        entry.setActorName(request.signerName());
        entry.setActorTitle(request.signerTitle());
        entry.setNotes(request.notes());
        entry.setHash(hash);
        auditRepository.save(entry);

        return SignOffResponse.from(record, mandatoryExternalAssuranceDeadline(companyId));
    }

    @Transactional
    public SignOffResponse revoke(int fiscalYear, RevokeSignOffRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        SignOffRecord record = signOffRepository.findByCompanyIdAndFiscalYear(companyId, fiscalYear)
                .orElseThrow(() -> new NotFoundException("No sign-off record for fiscal year " + fiscalYear));
        if (record.getStatus() != SignOffStatus.SIGNED) {
            throw new ConflictException("Fiscal year " + fiscalYear + " is not currently signed");
        }

        record.setStatus(SignOffStatus.REVOKED);
        record.setRevokedAt(Instant.now());
        record.setRevokedBy(user.getName());
        record.setRevocationReason(request.reason());
        signOffRepository.save(record);

        SignOffAuditEntry entry = new SignOffAuditEntry();
        entry.setCompanyId(companyId);
        entry.setFiscalYear(fiscalYear);
        entry.setAction(SignOffStatus.REVOKED);
        entry.setActorName(user.getName());
        entry.setNotes(request.reason());
        auditRepository.save(entry);

        return SignOffResponse.from(record, mandatoryExternalAssuranceDeadline(companyId));
    }

    @Transactional(readOnly = true)
    public List<SignOffAuditEntryResponse> auditTrail(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        return auditRepository.findByCompanyIdAndFiscalYearOrderByCreatedAtDesc(companyId, fiscalYear).stream()
                .map(SignOffAuditEntryResponse::from)
                .toList();
    }

    /**
     * Real SHA-256 digest of the actual signed content — every applicable indicator's value for
     * the fiscal year (sorted for determinism) plus the sign-off metadata. This makes the hash a
     * genuine tamper-evidence check: if any indicator value changes after sign-off, recomputing
     * this from current data no longer matches.
     */
    private String generateHash(UUID companyId, int fiscalYear, CreateSignOffRequest request, Instant signedAt) {
        Company company = companyRepository.findById(companyId).orElseThrow(() -> new NotFoundException("Company not found"));
        List<String> matterIds = matterSetResolverService.resolveApplicableMatters(company).stream()
                .map(SustainabilityMatter::getId).toList();
        List<IndicatorDefinition> defs = indicatorDefinitionRepository.findByMatterIdInOrderByCategoryAscNameAsc(matterIds);
        List<IndicatorValue> values = indicatorValueRepository.findByCompanyIdAndIndicatorDefinitionIdInOrderByFiscalYearAsc(
                companyId, defs.stream().map(IndicatorDefinition::getId).toList());

        String canonicalValues = values.stream()
                .filter(v -> v.getFiscalYear() == fiscalYear && v.getValue() != null)
                .sorted(Comparator.comparing(v -> v.getIndicatorDefinition().getId()))
                .map(v -> v.getIndicatorDefinition().getId() + ":" + v.getValue().toPlainString())
                .collect(Collectors.joining("|"));

        String content = canonicalValues + "||" + companyId + "|" + fiscalYear + "|"
                + request.signerName() + "|" + request.signerTitle() + "|" + signedAt;

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
