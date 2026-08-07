package com.wesee.esg.apiaccess;

import com.wesee.esg.apiaccess.dto.ApiTokenResponse;
import com.wesee.esg.apiaccess.dto.CreateApiTokenRequest;
import com.wesee.esg.apiaccess.dto.CreateApiTokenResponse;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class ApiTokenService {

    private static final String TOKEN_PREFIX = "lst_";
    private final SecureRandom random = new SecureRandom();

    private final ApiTokenRepository repository;
    private final CurrentUserProvider currentUserProvider;

    public ApiTokenService(ApiTokenRepository repository, CurrentUserProvider currentUserProvider) {
        this.repository = repository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public List<ApiTokenResponse> list() {
        return repository.findByCompanyId(currentUserProvider.requireCompanyId()).stream()
                .map(ApiTokenResponse::from)
                .toList();
    }

    @Transactional
    public CreateApiTokenResponse create(CreateApiTokenRequest request) {
        for (String scope : request.scopes()) {
            try {
                ApiScope.valueOf(scope);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Unknown scope: " + scope);
            }
        }

        String plaintext = generatePlaintextToken();

        ApiToken token = new ApiToken();
        token.setCompanyId(currentUserProvider.requireCompanyId());
        token.setName(request.name());
        token.setTokenPrefix(plaintext.substring(0, 12));
        token.setTokenHash(sha256Hex(plaintext));
        token.setScopes(request.scopes());
        token.setCreatedByUserId(currentUserProvider.getPrincipal().userId());
        if (request.expiresInDays() != null) {
            token.setExpiresAt(Instant.now().plus(request.expiresInDays(), ChronoUnit.DAYS));
        }

        return CreateApiTokenResponse.from(repository.save(token), plaintext);
    }

    @Transactional
    public void revoke(UUID id) {
        ApiToken token = repository.findByIdAndCompanyId(id, currentUserProvider.requireCompanyId())
                .orElseThrow(() -> new NotFoundException("Token not found"));
        if (token.getRevokedAt() != null) {
            throw new ConflictException("Token is already revoked");
        }
        token.setRevokedAt(Instant.now());
        repository.save(token);
    }

    private String generatePlaintextToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return TOKEN_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
