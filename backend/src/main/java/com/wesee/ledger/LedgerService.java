package com.wesee.ledger;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.TreeMap;

/**
 * Decentralized Carbon Ledger client (dev stub). Production: a Hyperledger Fabric client
 * committing chaincode transactions. Here we produce a deterministic content hash + tx id
 * so records are tamper-evident and re-verifiable, without a running Fabric network.
 */
@Service
public class LedgerService {

    public String commit(String channel, Map<String, Object> payload) {
        String canonical = channel + ":" + canonicalJson(payload);
        return sha256(canonical).substring(0, 40);
    }

    private static String canonicalJson(Map<String, Object> payload) {
        // Deterministic ordering so the same record always hashes identically.
        TreeMap<String, Object> sorted = new TreeMap<>(payload);
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (var e : sorted.entrySet()) {
            if (!first) sb.append(",");
            sb.append("\"").append(e.getKey()).append("\":\"").append(e.getValue()).append("\"");
            first = false;
        }
        return sb.append("}").toString();
    }

    private static String sha256(String s) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : d) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
