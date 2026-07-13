package com.wesee.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Engine 01 — reads a raw Malaysian bill and returns structured activity data.
 * BYO-Token: if a Gemini key is configured (per-tenant or the global fallback) it calls
 * Gemini; otherwise it returns a deterministic mock bill so the pipeline runs without a key.
 */
@Service
public class LlmExtractor {

    private static final String PROMPT = """
        You are reading a raw Malaysian utility or fuel bill (Tenaga Nasional, fleet diesel,
        warehouse LPG). Extract activity data for carbon accounting. Return ONLY a JSON object
        with keys: vendor, region (peninsular|sabah|sarawak), activity_type
        (grid_electricity|diesel|petrol|natural_gas|lpg|transport), activity_value (number),
        activity_unit (kWh|litre|m3|tonne-km), invoice_date, account_no, confidence (0-1).
        Never guess; use a low confidence if the document is unclear.
        """;

    private final String defaultKey;
    private final String defaultModel;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newHttpClient();

    public LlmExtractor(@Value("${wesee.gemini-api-key}") String defaultKey,
                        @Value("${wesee.gemini-model}") String defaultModel) {
        this.defaultKey = defaultKey;
        this.defaultModel = defaultModel;
    }

    public Map<String, Object> extract(byte[] imageBytes, String mimeType, String tenantKey, String tenantModel) {
        String key = (tenantKey != null && !tenantKey.isBlank()) ? tenantKey : defaultKey;
        String model = (tenantModel != null && !tenantModel.isBlank()) ? tenantModel : defaultModel;
        if (key == null || key.isBlank()) {
            return mockBill();
        }
        try {
            return gemini(imageBytes, mimeType, key, model);
        } catch (Exception e) {
            // Fail soft to the mock so a demo never dead-ends on a bad key / network.
            Map<String, Object> m = mockBill();
            m.put("vendor", "Tenaga Nasional Berhad (mock fallback: " + e.getClass().getSimpleName() + ")");
            return m;
        }
    }

    private Map<String, Object> mockBill() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("vendor", "Tenaga Nasional Berhad");
        m.put("region", "peninsular");
        m.put("activity_type", "grid_electricity");
        m.put("activity_value", 4200.0);
        m.put("activity_unit", "kWh");
        m.put("invoice_date", "2026-05-31");
        m.put("account_no", "DEMO-TNB-0001");
        m.put("confidence", 0.97);
        return m;
    }

    private Map<String, Object> gemini(byte[] imageBytes, String mimeType, String key, String model)
            throws Exception {
        String b64 = Base64.getEncoder().encodeToString(imageBytes);
        String body = mapper.writeValueAsString(Map.of(
                "contents", new Object[]{Map.of("parts", new Object[]{
                        Map.of("text", PROMPT),
                        Map.of("inline_data", Map.of("mime_type", mimeType, "data", b64))
                })},
                "generationConfig", Map.of("response_mime_type", "application/json")));

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/"
                        + model + ":generateContent?key=" + key))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        JsonNode root = mapper.readTree(resp.body());
        String text = root.at("/candidates/0/content/parts/0/text").asText();
        JsonNode parsed = mapper.readTree(stripFences(text));
        return mapper.convertValue(parsed, Map.class);
    }

    private static String stripFences(String t) {
        t = t.strip();
        if (t.startsWith("```")) {
            int first = t.indexOf('\n');
            int last = t.lastIndexOf("```");
            if (first >= 0 && last > first) return t.substring(first + 1, last).strip();
        }
        return t;
    }
}
