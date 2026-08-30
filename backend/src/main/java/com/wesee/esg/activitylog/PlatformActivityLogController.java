/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.activitylog;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/activity-log")
@PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'SUPERADMIN')")
public class PlatformActivityLogController {

    private final PlatformActivityLogService activityLogService;

    public PlatformActivityLogController(PlatformActivityLogService activityLogService) {
        this.activityLogService = activityLogService;
    }

    @GetMapping
    public List<ActivityLogResponse> listRecent(@RequestParam(required = false) Integer limit) {
        return activityLogService.listRecent(limit);
    }

    @GetMapping("/{id}")
    public ActivityLogResponse getById(@PathVariable UUID id) {
        return activityLogService.getById(id);
    }
}
