package com.wesee.web;

import com.wesee.factors.FactorService;
import com.wesee.ledger.LedgerService;
import com.wesee.llm.LlmExtractor;
import com.wesee.model.EmissionRecord;
import com.wesee.repo.EmissionRecordRepository;
import com.wesee.security.JwtService;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/** Engine 01 — ingest a raw bill → certified emission record + ledger commit. */
@RestController
public class CarbonController {

    private final LlmExtractor extractor;
    private final FactorService factors;
    private final LedgerService ledger;
    private final EmissionRecordRepository records;
    private final JwtService jwt;

    public CarbonController(LlmExtractor extractor, FactorService factors, LedgerService ledger,
                            EmissionRecordRepository records, JwtService jwt) {
        this.extractor = extractor;
        this.factors = factors;
        this.ledger = ledger;
        this.records = records;
        this.jwt = jwt;
    }

    @PostMapping("/carbon/ingest")
    public Dtos.EmissionRecordDto ingest(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String auth) throws Exception {

        Claims claims = jwt.requireAuth(auth);
        String orgId = claims.get("org_id", String.class);

        String mime = file.getContentType() != null ? file.getContentType() : "image/jpeg";
        // Engine 01: extract activity data (Gemini if a key is configured, else mock).
        Map<String, Object> extracted = extractor.extract(file.getBytes(), mime, null, null);

        FactorService.Calc calc;
        try {
            calc = factors.compute(extracted);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
        }

        EmissionRecord rec = new EmissionRecord();
        rec.setOrgId(orgId);
        rec.setScope(calc.scope());
        rec.setActivityType(String.valueOf(extracted.get("activity_type")));
        rec.setActivityValue(toDouble(extracted.get("activity_value")));
        rec.setActivityUnit(String.valueOf(extracted.get("activity_unit")));
        rec.setTco2e(calc.tco2e());
        rec.setFactorKey(calc.factorKey());
        rec.setFactorValue(calc.factorValue());
        rec.setFactorSource(calc.factorSource());
        rec.setFactorDatasetVersion(calc.factorDatasetVersion());
        rec.setConfidence(toDouble(extracted.getOrDefault("confidence", 1.0)));
        records.save(rec);

        String tx = ledger.commit("org-" + orgId,
                Map.of("record_id", rec.getId(), "tco2e", rec.getTco2e(), "scope", rec.getScope()));
        rec.setLedgerTxId(tx);
        records.save(rec);

        return Dtos.EmissionRecordDto.of(rec);
    }

    private static double toDouble(Object o) {
        return (o instanceof Number n) ? n.doubleValue() : Double.parseDouble(String.valueOf(o));
    }
}
