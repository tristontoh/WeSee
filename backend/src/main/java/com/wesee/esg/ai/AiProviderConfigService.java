package com.wesee.esg.ai;

import com.wesee.esg.ai.dto.AiProviderConfigResponse;
import com.wesee.esg.ai.dto.TestAiConnectionResponse;
import com.wesee.esg.ai.dto.UpdateAiProviderConfigRequest;
import com.wesee.esg.ai.provider.AiProviderClientFactory;
import com.wesee.esg.ai.provider.AiProviderException;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.security.SecretCryptoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AiProviderConfigService {

    private final AiProviderConfigRepository repository;
    private final CurrentUserProvider currentUserProvider;
    private final SecretCryptoService cryptoService;
    private final AiProviderClientFactory providerClientFactory;

    public AiProviderConfigService(AiProviderConfigRepository repository, CurrentUserProvider currentUserProvider,
                                    SecretCryptoService cryptoService, AiProviderClientFactory providerClientFactory) {
        this.repository = repository;
        this.currentUserProvider = currentUserProvider;
        this.cryptoService = cryptoService;
        this.providerClientFactory = providerClientFactory;
    }

    @Transactional(readOnly = true)
    public AiProviderConfigResponse get() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return repository.findByCompanyId(companyId)
                .map(AiProviderConfigResponse::from)
                .orElseGet(AiProviderConfigResponse::notConfigured);
    }

    @Transactional
    public AiProviderConfigResponse update(UpdateAiProviderConfigRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        AiProviderConfig config = repository.findByCompanyId(companyId).orElseGet(() -> {
            AiProviderConfig c = new AiProviderConfig();
            c.setCompanyId(companyId);
            return c;
        });

        boolean providerChanged = config.getProvider() != null && config.getProvider() != request.provider();

        if (request.apiKey() != null && !request.apiKey().isBlank()) {
            config.setApiKeyEncrypted(cryptoService.encrypt(request.apiKey()));
        } else if (config.getApiKeyEncrypted() == null) {
            throw new IllegalArgumentException("An API key is required when configuring AI for the first time");
        } else if (providerChanged) {
            throw new IllegalArgumentException("An API key is required when switching providers — keys aren't shared across providers");
        }

        config.setProvider(request.provider());
        config.setModel(request.model());
        config.setEnabled(request.enabled());
        config = repository.save(config);

        return AiProviderConfigResponse.from(config);
    }

    @Transactional
    public TestAiConnectionResponse testConnection() {
        DecryptedAiProviderConfig decrypted = resolveDecrypted(currentUserProvider.requireCompanyId());
        try {
            providerClientFactory.forProvider(decrypted.provider())
                    .complete(decrypted.apiKey(), decrypted.model(), "You are a connection test.", "Reply with the single word OK.");
            return new TestAiConnectionResponse(true, "Connected successfully.");
        } catch (AiProviderException e) {
            return new TestAiConnectionResponse(false, e.getMessage());
        }
    }

    /** Decrypts the company's configured key in-memory for the drafting/Q&A services — never exposed via a controller. */
    @Transactional(readOnly = true)
    public DecryptedAiProviderConfig resolveDecrypted(UUID companyId) {
        AiProviderConfig config = repository.findByCompanyId(companyId)
                .orElseThrow(() -> new ConflictException("AI isn't set up yet — ask a company admin to configure it in Settings > AI Assistant"));
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            throw new ConflictException("AI is currently disabled for this company — ask a company admin to re-enable it in Settings > AI Assistant");
        }
        return new DecryptedAiProviderConfig(config.getProvider(), config.getModel(), cryptoService.decrypt(config.getApiKeyEncrypted()));
    }
}
