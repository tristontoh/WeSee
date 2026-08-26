package com.wesee.esg.ai.prompt;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Seeded default prompt for a draftType — reference data (see V60__prompt_templates.sql), never created/edited via the API. */
@Entity
@Table(name = "prompt_template_default")
@Getter
@Setter
@NoArgsConstructor
public class PromptTemplateDefault {

    @Id
    @Column(name = "draft_type", length = 60)
    private String draftType;

    @Column(nullable = false, length = 150)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "system_prompt", nullable = false, columnDefinition = "TEXT")
    private String systemPrompt;

    @Column(name = "user_prompt_template", nullable = false, columnDefinition = "TEXT")
    private String userPromptTemplate;
}
