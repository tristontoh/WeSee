/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai;

import com.wesee.esg.ai.dto.MonthlyUsageEntry;
import com.wesee.esg.ai.dto.UsageSummaryResponse;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class AiUsageService {

    private final AiUsageLogRepository usageLogRepository;
    private final CurrentUserProvider currentUserProvider;

    public AiUsageService(AiUsageLogRepository usageLogRepository, CurrentUserProvider currentUserProvider) {
        this.usageLogRepository = usageLogRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public UsageSummaryResponse getUsage(int months) {
        UUID companyId = currentUserProvider.requireCompanyId();
        Instant since = Instant.now().minus((long) Math.max(months, 1) * 31, ChronoUnit.DAYS);

        List<MonthlyUsageEntry> entries = usageLogRepository.monthlyUsage(companyId, since).stream()
                .map(p -> new MonthlyUsageEntry(p.getMonth(), p.getRequestCount(), p.getSuccessCount(), p.getInputTokens(), p.getOutputTokens()))
                .toList();

        long totalRequests = entries.stream().mapToLong(MonthlyUsageEntry::requestCount).sum();
        long totalInputTokens = entries.stream().mapToLong(MonthlyUsageEntry::inputTokens).sum();
        long totalOutputTokens = entries.stream().mapToLong(MonthlyUsageEntry::outputTokens).sum();

        return new UsageSummaryResponse(entries, totalRequests, totalInputTokens, totalOutputTokens);
    }
}
