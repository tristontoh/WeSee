package com.wesee.esg.platform;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PlatformSettingsRepository extends JpaRepository<PlatformSettings, UUID> {
    Optional<PlatformSettings> findFirstByOrderByCreatedAtAsc();
}
