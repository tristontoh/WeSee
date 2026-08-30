/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.export;

import com.wesee.esg.activitylog.ActivityEventType;
import com.wesee.esg.activitylog.PlatformActivityLogService;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.indicators.IndicatorValue;
import com.wesee.esg.indicators.IndicatorValueRepository;
import com.wesee.esg.indicators.TenantIndicator;
import com.wesee.esg.indicators.TenantIndicatorRepository;
import com.wesee.esg.reference.IndicatorDefinition;
import com.wesee.esg.reference.IndicatorDefinitionRepository;
import com.wesee.esg.reference.MatterSetResolverService;
import com.wesee.esg.reference.SustainabilityMatter;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.StringWriter;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ExportService {

    private final IndicatorDefinitionRepository indicatorDefinitionRepository;
    private final IndicatorValueRepository indicatorValueRepository;
    private final TenantIndicatorRepository tenantIndicatorRepository;
    private final MatterSetResolverService matterSetResolverService;
    private final CurrentUserProvider currentUserProvider;
    private final CompanyRepository companyRepository;
    private final AppUserRepository appUserRepository;
    private final ExportHistoryItemRepository historyRepository;
    private final PlatformActivityLogService activityLogService;

    public ExportService(IndicatorDefinitionRepository indicatorDefinitionRepository,
                          IndicatorValueRepository indicatorValueRepository,
                          TenantIndicatorRepository tenantIndicatorRepository,
                          MatterSetResolverService matterSetResolverService,
                          CurrentUserProvider currentUserProvider,
                          CompanyRepository companyRepository,
                          AppUserRepository appUserRepository,
                          ExportHistoryItemRepository historyRepository,
                          PlatformActivityLogService activityLogService) {
        this.indicatorDefinitionRepository = indicatorDefinitionRepository;
        this.indicatorValueRepository = indicatorValueRepository;
        this.tenantIndicatorRepository = tenantIndicatorRepository;
        this.matterSetResolverService = matterSetResolverService;
        this.currentUserProvider = currentUserProvider;
        this.companyRepository = companyRepository;
        this.appUserRepository = appUserRepository;
        this.historyRepository = historyRepository;
        this.activityLogService = activityLogService;
    }

    @Transactional
    public byte[] generateRawIndicatorCsv(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Company company = currentCompany(companyId);
        List<IndicatorDefinition> defs = applicableIndicatorDefinitions(company);
        List<Integer> years = List.of(fiscalYear - 3, fiscalYear - 2, fiscalYear - 1, fiscalYear);

        Map<String, List<IndicatorValue>> valuesByDef = indicatorValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdInOrderByFiscalYearAsc(companyId, defs.stream().map(IndicatorDefinition::getId).toList())
                .stream().collect(Collectors.groupingBy(v -> v.getIndicatorDefinition().getId()));
        Map<String, TenantIndicator> overrides = tenantIndicatorRepository
                .findByCompanyIdAndIndicatorDefinitionIdIn(companyId, defs.stream().map(IndicatorDefinition::getId).toList())
                .stream().collect(Collectors.toMap(ti -> ti.getIndicatorDefinition().getId(), ti -> ti));

        StringWriter sw = new StringWriter();
        List<String> headers = new java.util.ArrayList<>(List.of("ID", "Name", "Matter ID", "Category", "Unit"));
        years.forEach(y -> headers.add("FY" + y));
        headers.add("Target");

        try (CSVPrinter printer = new CSVPrinter(sw, CSVFormat.DEFAULT.builder().setHeader(headers.toArray(new String[0])).build())) {
            for (IndicatorDefinition def : defs) {
                Map<Integer, BigDecimal> yearValues = valuesByDef.getOrDefault(def.getId(), List.of()).stream()
                        .collect(Collectors.toMap(IndicatorValue::getFiscalYear, IndicatorValue::getValue, (a, b) -> b));
                TenantIndicator override = overrides.get(def.getId());
                BigDecimal effectiveTarget = override != null && override.getTarget() != null ? override.getTarget() : def.getDefaultTarget();

                List<Object> row = new java.util.ArrayList<>(List.of(def.getId(), def.getName(), def.getMatter().getId(), def.getCategory(), def.getUnit()));
                for (Integer y : years) {
                    BigDecimal v = yearValues.get(y);
                    row.add(v != null ? v.toPlainString() : "");
                }
                row.add(effectiveTarget != null ? effectiveTarget.toPlainString() : "");
                printer.printRecord(row);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }

        logExport(companyId, "Raw Indicators Ledger", ExportFormat.CSV, fiscalYear);
        return sw.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional
    public byte[] generateCsiExportCsv(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Company company = currentCompany(companyId);
        List<IndicatorDefinition> defs = applicableIndicatorDefinitions(company);

        Map<String, IndicatorValue> valueByDef = indicatorValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdInOrderByFiscalYearAsc(companyId, defs.stream().map(IndicatorDefinition::getId).toList())
                .stream()
                .filter(v -> v.getFiscalYear() == fiscalYear)
                .collect(Collectors.toMap(v -> v.getIndicatorDefinition().getId(), v -> v, (a, b) -> b));

        StringWriter sw = new StringWriter();
        String[] headers = {"Bursa Matter ID", "Bursa Metric Code", "Metric Title", "Reporting Value", "Reporting Unit", "Submission Status", "Manual Sync Guidance"};

        try (CSVPrinter printer = new CSVPrinter(sw, CSVFormat.DEFAULT.builder().setHeader(headers).build())) {
            for (IndicatorDefinition def : defs) {
                IndicatorValue value = valueByDef.get(def.getId());
                String reportingValue = value != null && value.getValue() != null ? value.getValue().toPlainString() : "";
                String status = value != null && value.getValue() != null ? "CSI-Compatible-Ready" : "Pending Data Entry";
                printer.printRecord(
                        def.getMatter().getId(),
                        def.getId(),
                        def.getName(),
                        reportingValue,
                        def.getUnit(),
                        status,
                        "Review and transfer into the relevant section of Bursa's CSI Manual Portal"
                );
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }

        logExport(companyId, "Bursa CSI Manual Import", ExportFormat.CSV_CSI, fiscalYear);
        return sw.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional
    public void logClientGeneratedExport(com.wesee.esg.export.dto.LogExportRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        logExport(companyId, request.exportType(), request.format(), request.fiscalYear());
    }

    @Transactional(readOnly = true)
    public List<com.wesee.esg.export.dto.ExportHistoryResponse> listHistory() {
        return historyRepository.findByCompanyIdOrderByCreatedAtDesc(currentUserProvider.requireCompanyId()).stream()
                .map(com.wesee.esg.export.dto.ExportHistoryResponse::from)
                .toList();
    }

    @Transactional
    public com.wesee.esg.export.dto.ExportHistoryResponse signOff(UUID id) {
        ExportHistoryItem item = historyRepository.findByIdAndCompanyId(id, currentUserProvider.requireCompanyId())
                .orElseThrow(() -> new NotFoundException("Export not found"));
        if (item.getSignedOffAt() != null) {
            throw new ConflictException("Already signed off");
        }
        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId()).orElse(null);
        item.setSignedOffByName(user != null ? user.getName() : "Unknown");
        item.setSignedOffAt(java.time.Instant.now());
        return com.wesee.esg.export.dto.ExportHistoryResponse.from(historyRepository.save(item));
    }

    private List<IndicatorDefinition> applicableIndicatorDefinitions(Company company) {
        List<String> matterIds = matterSetResolverService.resolveApplicableMatters(company).stream()
                .map(SustainabilityMatter::getId).toList();
        return indicatorDefinitionRepository.findByMatterIdInOrderByCategoryAscNameAsc(matterIds);
    }

    private Company currentCompany(UUID companyId) {
        return companyRepository.findById(companyId).orElseThrow(() -> new NotFoundException("Company not found"));
    }

    private void logExport(UUID companyId, String type, ExportFormat format, int fiscalYear) {
        AppUser user = appUserRepository.findById(currentUserProvider.getPrincipal().userId()).orElse(null);
        ExportHistoryItem item = new ExportHistoryItem();
        item.setCompanyId(companyId);
        item.setExportType(type);
        item.setFormat(format);
        item.setFiscalYear(fiscalYear);
        item.setGeneratedByName(user != null ? user.getName() : "Unknown");
        historyRepository.save(item);

        Company company = companyRepository.findById(companyId).orElse(null);
        activityLogService.record(companyId, company != null ? company.getName() : "Unknown company",
                ActivityEventType.EXPORT_SUCCESS,
                "Successfully generated " + type + " export for FY" + fiscalYear);
    }
}
