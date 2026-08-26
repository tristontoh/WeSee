package com.wesee.esg.ai;

import com.wesee.esg.ai.dto.DraftRequest;
import com.wesee.esg.ai.dto.DraftResponse;
import com.wesee.esg.ai.prompt.PromptTemplateService;
import com.wesee.esg.ai.prompt.ResolvedPromptTemplate;
import com.wesee.esg.ai.provider.AiCompletionResult;
import com.wesee.esg.ai.provider.AiProviderClientFactory;
import com.wesee.esg.ai.provider.AiProviderException;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.tenant.MarketClassification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Orchestrates a single "Draft with AI" call: resolve the effective prompt template for the
 * draftType, fill its {{placeholder}} tokens from the caller-supplied context, call the
 * company's configured provider, and log the result (success or failure) to ai_usage_log.
 */
@Service
public class AiDraftService {

    private static final Logger log = LoggerFactory.getLogger(AiDraftService.class);
    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\{\\{(\\w+)}}");

    private final CurrentUserProvider currentUserProvider;
    private final AiProviderConfigService providerConfigService;
    private final PromptTemplateService promptTemplateService;
    private final AiProviderClientFactory providerClientFactory;
    private final AiUsageLogRepository usageLogRepository;
    private final CompanyRepository companyRepository;

    public AiDraftService(CurrentUserProvider currentUserProvider, AiProviderConfigService providerConfigService,
                           PromptTemplateService promptTemplateService, AiProviderClientFactory providerClientFactory,
                           AiUsageLogRepository usageLogRepository, CompanyRepository companyRepository) {
        this.currentUserProvider = currentUserProvider;
        this.providerConfigService = providerConfigService;
        this.promptTemplateService = promptTemplateService;
        this.providerClientFactory = providerClientFactory;
        this.usageLogRepository = usageLogRepository;
        this.companyRepository = companyRepository;
    }

    /**
     * Deliberately NOT @Transactional: on a provider failure we must still persist the usage-log
     * row in the catch block below. If this whole method were one transaction, the re-thrown
     * AiProviderException (a RuntimeException) would trigger Spring's default rollback rule and
     * silently roll back that very save — leaving failures completely absent from ai_usage_log.
     * Without a surrounding transaction, each repository call below runs and commits in its own
     * transaction, so the failure-path log write survives regardless of what happens after it.
     */
    public DraftResponse draft(DraftRequest request) {
        String text = complete("draft", request.draftType(), request.context());
        return new DraftResponse(text);
    }

    /**
     * Shared orchestration behind both "Draft with AI" and the Q&A assistant: resolve the
     * effective template for draftType, fill it from context, call the company's configured
     * provider, and log to ai_usage_log under the given feature name ("draft" or "qa").
     */
    public String complete(String feature, String draftType, Map<String, String> context) {
        UUID companyId = currentUserProvider.requireCompanyId();
        DecryptedAiProviderConfig config = providerConfigService.resolveDecrypted(companyId);
        ResolvedPromptTemplate template = promptTemplateService.resolve(draftType, companyId);

        Map<String, String> fullContext = new HashMap<>(context);
        fullContext.putAll(companyIdentityFields(companyId));

        String systemPrompt = fillPlaceholders(template.systemPrompt(), fullContext, draftType);
        String userPrompt = fillPlaceholders(template.userPromptTemplate(), fullContext, draftType);

        try {
            AiCompletionResult result = providerClientFactory.forProvider(config.provider())
                    .complete(config.apiKey(), config.model(), systemPrompt, userPrompt);
            logUsage(companyId, feature, draftType, config, result.inputTokens(), result.outputTokens(), true, null);
            return result.text();
        } catch (AiProviderException e) {
            logUsage(companyId, feature, draftType, config, 0, 0, false, e.getMessage());
            throw e;
        }
    }

    /**
     * companyName/sector/marketClassification are canonical company identity fields, not
     * caller-supplied data — resolved here from the authenticated company rather than trusted
     * from the frontend, so every draftType's template can rely on them regardless of what the
     * caller's context map does or doesn't include.
     */
    private Map<String, String> companyIdentityFields(UUID companyId) {
        Company company = companyRepository.findById(companyId).orElseThrow();
        Map<String, String> fields = new HashMap<>();
        fields.put("companyName", company.getName() != null ? company.getName() : "");
        fields.put("sector", company.getSector() != null ? company.getSector().getCode() : "");
        fields.put("marketClassification", marketLabel(company.getMarketClassification()));
        return fields;
    }

    private String marketLabel(MarketClassification market) {
        if (market == null) {
            return "";
        }
        return switch (market) {
            case SME -> "SME";
            case MAIN_MARKET -> "Main Market";
            case ACE_MARKET -> "ACE Market";
        };
    }

    private String fillPlaceholders(String template, Map<String, String> context, String draftType) {
        Matcher matcher = PLACEHOLDER_PATTERN.matcher(template);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            String key = matcher.group(1);
            String value = context.get(key);
            if (value == null) {
                log.warn("AI draft '{}': no context value supplied for placeholder '{}'", draftType, key);
                value = matcher.group();
            }
            matcher.appendReplacement(result, Matcher.quoteReplacement(value));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private void logUsage(UUID companyId, String feature, String draftType, DecryptedAiProviderConfig config,
                           int inputTokens, int outputTokens, boolean success, String errorMessage) {
        AiUsageLog entry = new AiUsageLog();
        entry.setCompanyId(companyId);
        entry.setFeature(feature);
        entry.setDraftType(draftType);
        entry.setProvider(config.provider());
        entry.setModel(config.model());
        entry.setInputTokens(inputTokens);
        entry.setOutputTokens(outputTokens);
        entry.setSuccess(success);
        entry.setErrorMessage(errorMessage != null && errorMessage.length() > 1000 ? errorMessage.substring(0, 1000) : errorMessage);
        usageLogRepository.save(entry);
    }
}
