package com.wesee.web;

import com.wesee.model.EmissionRecord;
import com.wesee.repo.EmissionRecordRepository;
import com.wesee.security.JwtService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class DashboardController {

    private final EmissionRecordRepository records;
    private final JwtService jwt;

    public DashboardController(EmissionRecordRepository records, JwtService jwt) {
        this.records = records;
        this.jwt = jwt;
    }

    /** Live emissions overview for the logged-in org (Engine 01 certified records). */
    @GetMapping("/dashboard/carbon")
    public Dtos.CarbonOverview carbon(@RequestHeader(value = "Authorization", required = false) String auth) {
        String orgId = jwt.requireAuth(auth).get("org_id", String.class);
        List<EmissionRecord> rows = records.findByOrgId(orgId);

        double s1 = rows.stream().filter(r -> r.getScope() == 1).mapToDouble(EmissionRecord::getTco2e).sum();
        double s2 = rows.stream().filter(r -> r.getScope() == 2).mapToDouble(EmissionRecord::getTco2e).sum();
        double s3 = rows.stream().filter(r -> r.getScope() == 3).mapToDouble(EmissionRecord::getTco2e).sum();

        return new Dtos.CarbonOverview(
                round(s1 + s2 + s3), round(s1), round(s2), round(s3), 68,
                rows.stream().map(Dtos.EmissionRecordDto::of).toList());
    }

    private static double round(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }
}
