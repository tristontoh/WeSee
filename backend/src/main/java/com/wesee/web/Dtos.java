package com.wesee.web;

import com.wesee.model.EmissionRecord;

import java.util.List;

/** Response DTOs. With SNAKE_CASE Jackson config, fields serialize as the frontend expects
 * (access_token, org_type, total_tco2e, activity_type, factor_source, ledger_tx_id, …). */
public final class Dtos {

    public record LoginResponse(String accessToken, String tokenType, String orgType) {}

    public record EmissionRecordDto(
            String id, int scope, String activityType, double activityValue, String activityUnit,
            double tco2e, String factorSource, String factorDatasetVersion, double confidence,
            String ledgerTxId) {

        public static EmissionRecordDto of(EmissionRecord r) {
            return new EmissionRecordDto(
                    r.getId(), r.getScope(), r.getActivityType(), r.getActivityValue(),
                    r.getActivityUnit(), r.getTco2e(), r.getFactorSource(),
                    r.getFactorDatasetVersion(), r.getConfidence(), r.getLedgerTxId());
        }
    }

    public record CarbonOverview(
            double totalTco2e, double scope1, double scope2, double scope3,
            int targetProgressPct, List<EmissionRecordDto> records) {}
}
