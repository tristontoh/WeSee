/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai.prompt;

/** The effective prompt for a draftType — the company's override if it exists, else the seeded default. */
public record ResolvedPromptTemplate(String systemPrompt, String userPromptTemplate) {
}
