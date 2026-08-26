package com.wesee.esg.ai;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Append-only usage record for one AI drafting/assistant call — visibility only, no enforced quota. */
@Entity
@Table(name = "ai_usage_log")
@Getter
@Setter
@NoArgsConstructor
public class AiUsageLog extends TenantOwnedEntity {

    @Column(nullable = false, length = 30)
    private String feature;

    @Column(name = "draft_type", length = 60)
    private String draftType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiProvider provider;

    @Column(nullable = false, length = 100)
    private String model;

    @Column(name = "input_tokens", nullable = false)
    private Integer inputTokens = 0;

    @Column(name = "output_tokens", nullable = false)
    private Integer outputTokens = 0;

    @Column(nullable = false)
    private Boolean success;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;
}
