package com.wesee.esg.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserNotificationPreferencesRepository extends JpaRepository<UserNotificationPreferences, UUID> {
    Optional<UserNotificationPreferences> findByUserId(UUID userId);
}
