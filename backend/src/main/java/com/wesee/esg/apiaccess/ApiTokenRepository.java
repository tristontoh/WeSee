package com.wesee.esg.apiaccess;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApiTokenRepository extends JpaRepository<ApiToken, UUID> {
    List<ApiToken> findByCompanyId(UUID companyId);

    Optional<ApiToken> findByIdAndCompanyId(UUID id, UUID companyId);

    Optional<ApiToken> findByTokenHash(String tokenHash);
}
