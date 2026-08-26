package com.wesee.esg.ai.prompt;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A company's customization of a single draftType's prompt — only present once an admin edits it; absent means "use the default". */
@Entity
@Table(name = "prompt_template_override")
@Getter
@Setter
@NoArgsConstructor
public class PromptTemplateOverride extends TenantOwnedEntity {

    @Column(name = "draft_type", nullable = false, length = 60)
    private String draftType;

    @Column(name = "system_prompt", columnDefinition = "TEXT")
    private String systemPrompt;

    @Column(name = "user_prompt_template", columnDefinition = "TEXT")
    private String userPromptTemplate;
}
