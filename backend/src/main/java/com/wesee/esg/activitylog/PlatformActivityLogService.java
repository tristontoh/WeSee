/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.activitylog;

import com.wesee.esg.common.exceptions.NotFoundException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class PlatformActivityLogService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 500;

    private final PlatformActivityLogRepository repository;

    public PlatformActivityLogService(PlatformActivityLogRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void record(UUID companyId, String companyName, ActivityEventType eventType, String description) {
        PlatformActivityLog log = new PlatformActivityLog();
        log.setCompanyId(companyId);
        log.setCompanyName(companyName);
        log.setEventType(eventType);
        log.setDescription(description);
        repository.save(log);
    }

    @Transactional(readOnly = true)
    public List<ActivityLogResponse> listRecent(Integer limit) {
        return repository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, effectiveLimit(limit))).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ActivityLogResponse getById(UUID id) {
        PlatformActivityLog log = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Audit log entry not found"));
        return toResponse(log);
    }

    @Transactional(readOnly = true)
    public List<ActivityLogResponse> listRecentForCompany(UUID companyId, Integer limit) {
        return repository.findByCompanyIdOrderByCreatedAtDesc(companyId, PageRequest.of(0, effectiveLimit(limit))).stream()
                .map(this::toResponse)
                .toList();
    }

    /** Same lookup as {@link #getById}, but 404s on a real entry from another company rather than leaking its existence. */
    @Transactional(readOnly = true)
    public ActivityLogResponse getByIdForCompany(UUID companyId, UUID id) {
        PlatformActivityLog log = repository.findById(id)
                .filter(l -> companyId.equals(l.getCompanyId()))
                .orElseThrow(() -> new NotFoundException("Audit log entry not found"));
        return toResponse(log);
    }

    private int effectiveLimit(Integer limit) {
        return limit == null ? DEFAULT_LIMIT : Math.max(1, Math.min(limit, MAX_LIMIT));
    }

    private ActivityLogResponse toResponse(PlatformActivityLog log) {
        return new ActivityLogResponse(log.getId(), log.getCreatedAt(), log.getCompanyId(), log.getCompanyName(), log.getEventType(), log.getDescription());
    }
}
