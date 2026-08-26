package com.wesee.esg.ai.provider;

public record AiCompletionResult(String text, int inputTokens, int outputTokens) {
}
