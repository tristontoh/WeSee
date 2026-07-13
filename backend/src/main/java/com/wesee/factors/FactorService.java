package com.wesee.factors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Versioned Malaysian emission-factor engine.
 * Every calculation records which factor + dataset version + source was applied, so a
 * tCO2e number can be traced back to an authoritative published factor for audit.
 */
@Service
public class FactorService {

    private JsonNode data;

    /** Result of applying a factor: the tCO2e plus full provenance. */
    public record Calc(
            double tco2e, int scope, String factorKey, double factorValue,
            String factorSource, String factorDatasetVersion) {}

    @PostConstruct
    void load() throws Exception {
        try (var in = new ClassPathResource("malaysia_factors.json").getInputStream()) {
            data = new ObjectMapper().readTree(in);
        }
    }

    public String datasetVersion() {
        return data.get("dataset_version").asText();
    }

    /** Resolve the right factor for the extracted activity and compute emissions. */
    public Calc compute(Map<String, Object> extracted) {
        String activity = String.valueOf(extracted.get("activity_type"));
        double value = toDouble(extracted.get("activity_value"));
        String unit = String.valueOf(extracted.getOrDefault("activity_unit", "")).toLowerCase();
        String version = datasetVersion();

        switch (activity) {
            case "grid_electricity" -> {
                String region = String.valueOf(extracted.getOrDefault("region", "peninsular")).toLowerCase();
                JsonNode block = data.get("grid_electricity");
                JsonNode f = find(block.get("factors"), "region", region);
                double factor = f.get("factor").asDouble();
                double mwh = unit.equals("kwh") ? value / 1000.0 : value;
                return new Calc(round(mwh * factor, 4), block.get("scope").asInt(),
                        "grid_electricity:" + region, factor, f.get("source").asText(), version);
            }
            case "diesel", "petrol", "natural_gas", "lpg" -> {
                JsonNode block = data.get("stationary_combustion");
                JsonNode f = find(block.get("factors"), "fuel", activity);
                double factor = f.get("factor").asDouble();
                return new Calc(round(value * factor / 1000.0, 4), block.get("scope").asInt(),
                        "stationary_combustion:" + activity, factor, f.get("source").asText(), version);
            }
            case "transport" -> {
                String mode = String.valueOf(extracted.getOrDefault("mode", "road_hgv")).toLowerCase();
                JsonNode block = data.get("transport_distance");
                JsonNode f = find(block.get("factors"), "mode", mode);
                double factor = f.get("factor").asDouble();
                return new Calc(round(value * factor / 1000.0, 4), block.get("scope").asInt(),
                        "transport_distance:" + mode, factor, f.get("source").asText(), version);
            }
            default -> throw new IllegalArgumentException("No factor mapping for activity_type=" + activity);
        }
    }

    private static JsonNode find(JsonNode arr, String key, String val) {
        for (JsonNode n : arr) {
            if (n.get(key).asText().equalsIgnoreCase(val)) return n;
        }
        throw new IllegalArgumentException("Unknown " + key + "=" + val);
    }

    private static double toDouble(Object o) {
        return (o instanceof Number n) ? n.doubleValue() : Double.parseDouble(String.valueOf(o));
    }

    private static double round(double v, int places) {
        double p = Math.pow(10, places);
        return Math.round(v * p) / p;
    }
}
