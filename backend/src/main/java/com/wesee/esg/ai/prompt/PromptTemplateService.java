package com.wesee.esg.ai.prompt;

import com.wesee.esg.ai.prompt.dto.PromptTemplateResponse;
import com.wesee.esg.ai.prompt.dto.UpdatePromptTemplateRequest;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Resolves the effective prompt for a draftType (company override if customized, else the seeded
 * default — see V60__prompt_templates.sql) and backs the admin-editable Prompt Library. A future
 * fix to a shipped default reaches every company that never customized it, since only the diff is
 * ever stored per-company.
 */
@Service
public class PromptTemplateService {

    private final PromptTemplateDefaultRepository defaultRepository;
    private final PromptTemplateOverrideRepository overrideRepository;
    private final CurrentUserProvider currentUserProvider;

    public PromptTemplateService(PromptTemplateDefaultRepository defaultRepository,
                                  PromptTemplateOverrideRepository overrideRepository,
                                  CurrentUserProvider currentUserProvider) {
        this.defaultRepository = defaultRepository;
        this.overrideRepository = overrideRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public ResolvedPromptTemplate resolve(String draftType, UUID companyId) {
        PromptTemplateDefault def = defaultRepository.findById(draftType)
                .orElseThrow(() -> new NotFoundException("Unknown AI draft type: " + draftType));
        return overrideRepository.findByCompanyIdAndDraftType(companyId, draftType)
                .map(o -> new ResolvedPromptTemplate(o.getSystemPrompt(), o.getUserPromptTemplate()))
                .orElseGet(() -> new ResolvedPromptTemplate(def.getSystemPrompt(), def.getUserPromptTemplate()));
    }

    @Transactional(readOnly = true)
    public List<PromptTemplateResponse> listForCompany() {
        UUID companyId = currentUserProvider.requireCompanyId();
        Map<String, PromptTemplateOverride> overridesByType = overrideRepository.findByCompanyId(companyId).stream()
                .collect(Collectors.toMap(PromptTemplateOverride::getDraftType, o -> o));

        return defaultRepository.findAll().stream()
                .map(def -> {
                    PromptTemplateOverride override = overridesByType.get(def.getDraftType());
                    boolean customized = override != null;
                    return new PromptTemplateResponse(
                            def.getDraftType(),
                            def.getLabel(),
                            def.getDescription(),
                            customized ? override.getSystemPrompt() : def.getSystemPrompt(),
                            customized ? override.getUserPromptTemplate() : def.getUserPromptTemplate(),
                            customized
                    );
                })
                .toList();
    }

    @Transactional
    public PromptTemplateResponse upsertOverride(String draftType, UpdatePromptTemplateRequest request) {
        PromptTemplateDefault def = defaultRepository.findById(draftType)
                .orElseThrow(() -> new NotFoundException("Unknown AI draft type: " + draftType));
        UUID companyId = currentUserProvider.requireCompanyId();

        PromptTemplateOverride override = overrideRepository.findByCompanyIdAndDraftType(companyId, draftType)
                .orElseGet(() -> {
                    PromptTemplateOverride o = new PromptTemplateOverride();
                    o.setCompanyId(companyId);
                    o.setDraftType(draftType);
                    return o;
                });
        override.setSystemPrompt(request.systemPrompt());
        override.setUserPromptTemplate(request.userPromptTemplate());
        overrideRepository.save(override);

        return new PromptTemplateResponse(def.getDraftType(), def.getLabel(), def.getDescription(),
                request.systemPrompt(), request.userPromptTemplate(), true);
    }

    @Transactional
    public PromptTemplateResponse resetToDefault(String draftType) {
        PromptTemplateDefault def = defaultRepository.findById(draftType)
                .orElseThrow(() -> new NotFoundException("Unknown AI draft type: " + draftType));
        UUID companyId = currentUserProvider.requireCompanyId();
        overrideRepository.deleteByCompanyIdAndDraftType(companyId, draftType);

        return new PromptTemplateResponse(def.getDraftType(), def.getLabel(), def.getDescription(),
                def.getSystemPrompt(), def.getUserPromptTemplate(), false);
    }
}
