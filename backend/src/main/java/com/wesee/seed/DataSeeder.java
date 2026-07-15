package com.wesee.seed;

import com.wesee.factors.FactorService;
import com.wesee.ledger.LedgerService;
import com.wesee.model.*;
import com.wesee.repo.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Seeds demo data on first run (mirrors the Python app.seed): a Compliance Hub buyer + a Workspace supplier
 * with three assurance-tiered supplier links, and three certified emission records for the Workspace org
 * (computed through the factor engine → ~714.6 tCO2e total) so the dashboard shows live data.
 *
 * Demo logins: buyer@demo.my / workspace@demo.my  (password: demo1234)
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final OrganizationRepository orgs;
    private final UserRepository users;
    private final EmissionRecordRepository emissions;
    private final SupplierLinkRepository links;
    private final FactorService factors;
    private final LedgerService ledger;
    private final BCryptPasswordEncoder encoder;

    public DataSeeder(OrganizationRepository orgs, UserRepository users,
                      EmissionRecordRepository emissions, SupplierLinkRepository links,
                      FactorService factors, LedgerService ledger, BCryptPasswordEncoder encoder) {
        this.orgs = orgs;
        this.users = users;
        this.emissions = emissions;
        this.links = links;
        this.factors = factors;
        this.ledger = ledger;
        this.encoder = encoder;
    }

    // Activity data chosen so the factor engine yields ~184.2 / ~97.6 / ~432.8 tCO2e.
    private static final List<Map<String, Object>> WORKSPACE_ACTIVITIES = List.of(
            Map.of("activity_type", "diesel", "activity_value", 68700.0, "activity_unit", "litre"),
            Map.of("activity_type", "grid_electricity", "region", "peninsular",
                    "activity_value", 167000.0, "activity_unit", "kWh"),
            Map.of("activity_type", "transport", "mode", "road_hgv",
                    "activity_value", 4122000.0, "activity_unit", "tonne-km"));

    @Override
    public void run(String... args) {
        if (users.findByEmail("buyer@demo.my").isPresent()) {
            return; // already seeded
        }
        String hash = encoder.encode("demo1234");

        Organization buyer = new Organization();
        buyer.setName("Demo Manufacturing Bhd");
        buyer.setOrgType(OrgType.COMPLIANCE_HUB);
        orgs.save(buyer);
        users.save(new User(buyer.getId(), "buyer@demo.my", hash, "admin"));

        Organization workspace = new Organization();
        workspace.setName("Acme Supplies Sdn Bhd");
        workspace.setOrgType(OrgType.WORKSPACE);
        orgs.save(workspace);
        users.save(new User(workspace.getId(), "workspace@demo.my", hash, "admin"));

        // Workspace org's certified emission records → the dashboard's live scope totals.
        for (Map<String, Object> act : WORKSPACE_ACTIVITIES) {
            FactorService.Calc calc = factors.compute(act);
            EmissionRecord rec = new EmissionRecord();
            rec.setOrgId(workspace.getId());
            rec.setScope(calc.scope());
            rec.setActivityType((String) act.get("activity_type"));
            rec.setActivityValue(((Number) act.get("activity_value")).doubleValue());
            rec.setActivityUnit((String) act.get("activity_unit"));
            rec.setTco2e(calc.tco2e());
            rec.setFactorKey(calc.factorKey());
            rec.setFactorValue(calc.factorValue());
            rec.setFactorSource(calc.factorSource());
            rec.setFactorDatasetVersion(calc.factorDatasetVersion());
            rec.setConfidence(0.97);
            emissions.save(rec);
            rec.setLedgerTxId(ledger.commit("org-" + workspace.getId(),
                    Map.of("record_id", rec.getId(), "tco2e", rec.getTco2e(), "scope", rec.getScope())));
            emissions.save(rec);
        }

        // Supplier assurance ledger (three tiers, mirrors the design's slide 6).
        links.save(new SupplierLink(buyer.getId(), workspace.getId(), "Supplier A",
                AssuranceTier.SYSTEM_VERIFIED, 100, true));
        links.save(new SupplierLink(buyer.getId(), null, "Supplier B",
                AssuranceTier.ENTERPRISE_INGESTED, 92, false));
        links.save(new SupplierLink(buyer.getId(), null, "Supplier C",
                AssuranceTier.UNVERIFIED, 45, false));

        System.out.println("Seeded: buyer@demo.my / workspace@demo.my  (password: demo1234)");
    }
}
