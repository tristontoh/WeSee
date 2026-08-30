/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.user;

import com.wesee.esg.user.dto.NotificationPreferencesResponse;
import com.wesee.esg.user.dto.UpdateNotificationPreferencesRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Self-service notification preferences, open to every authenticated role. */
@RestController
@RequestMapping("/api/v1/users/me/notification-preferences")
public class NotificationPreferencesController {

    private final NotificationPreferencesService notificationPreferencesService;

    public NotificationPreferencesController(NotificationPreferencesService notificationPreferencesService) {
        this.notificationPreferencesService = notificationPreferencesService;
    }

    @GetMapping
    public NotificationPreferencesResponse getPreferences() {
        return notificationPreferencesService.getMyPreferences();
    }

    @PatchMapping
    public NotificationPreferencesResponse updatePreferences(@Valid @RequestBody UpdateNotificationPreferencesRequest request) {
        return notificationPreferencesService.updateMyPreferences(request);
    }
}
