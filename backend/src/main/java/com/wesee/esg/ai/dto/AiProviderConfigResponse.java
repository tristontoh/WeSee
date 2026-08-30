/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.ai.dto;

import com.wesee.esg.ai.AiProvider;
import com.wesee.esg.ai.AiProviderConfig;

public record AiProviderConfigResponse(
        boolean configured,
        AiProvider provider,
        String model,
        boolean enabled,
        boolean apiKeySet
) {
    public static AiProviderConfigResponse from(AiProviderConfig c) {
        return new AiProviderConfigResponse(true, c.getProvider(), c.getModel(), Boolean.TRUE.equals(c.getEnabled()), true);
    }

    public static AiProviderConfigResponse notConfigured() {
        return new AiProviderConfigResponse(false, null, null, false, false);
    }
}
