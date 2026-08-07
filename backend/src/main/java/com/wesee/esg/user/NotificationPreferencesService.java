package com.wesee.esg.user;

import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.user.dto.NotificationPreferencesResponse;
import com.wesee.esg.user.dto.UpdateNotificationPreferencesRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class NotificationPreferencesService {

    private final UserNotificationPreferencesRepository repository;
    private final CurrentUserProvider currentUserProvider;

    public NotificationPreferencesService(UserNotificationPreferencesRepository repository,
                                           CurrentUserProvider currentUserProvider) {
        this.repository = repository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public NotificationPreferencesResponse getMyPreferences() {
        return NotificationPreferencesResponse.from(repository.findByUserId(currentUserId()).orElse(null));
    }

    @Transactional
    public NotificationPreferencesResponse updateMyPreferences(UpdateNotificationPreferencesRequest request) {
        UUID userId = currentUserId();
        UserNotificationPreferences prefs = repository.findByUserId(userId).orElseGet(() -> newPrefsFor(userId));
        prefs.setReportDeadlineReminders(request.reportDeadlineReminders());
        prefs.setTeamActivityAlerts(request.teamActivityAlerts());
        prefs.setComplianceAlerts(request.complianceAlerts());
        prefs.setWeeklyDigest(request.weeklyDigest());
        return NotificationPreferencesResponse.from(repository.save(prefs));
    }

    private UUID currentUserId() {
        return currentUserProvider.getPrincipal().userId();
    }

    private UserNotificationPreferences newPrefsFor(UUID userId) {
        UserNotificationPreferences prefs = new UserNotificationPreferences();
        prefs.setUserId(userId);
        return prefs;
    }
}
