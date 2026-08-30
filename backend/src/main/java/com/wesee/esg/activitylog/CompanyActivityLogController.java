/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.activitylog;

import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Company-scoped counterpart to {@link PlatformActivityLogController} — same event log, filtered to the caller's own company. */
@RestController
@RequestMapping("/api/v1/activity-log")
@PreAuthorize("@perm.check('audit_log.view')")
public class CompanyActivityLogController {

    private final PlatformActivityLogService activityLogService;
    private final CurrentUserProvider currentUserProvider;

    public CompanyActivityLogController(PlatformActivityLogService activityLogService, CurrentUserProvider currentUserProvider) {
        this.activityLogService = activityLogService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    public List<ActivityLogResponse> listRecent(@RequestParam(required = false) Integer limit) {
        return activityLogService.listRecentForCompany(currentUserProvider.requireCompanyId(), limit);
    }

    @GetMapping("/{id}")
    public ActivityLogResponse getById(@PathVariable UUID id) {
        return activityLogService.getByIdForCompany(currentUserProvider.requireCompanyId(), id);
    }
}
