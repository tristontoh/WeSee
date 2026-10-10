/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root - visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.reference.AggregationRule;
import com.wesee.esg.reference.IndicatorDefinition;
import com.wesee.esg.reference.IndicatorDefinitionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pins the catalogue against the registry.
 *
 * <p>This exists because of a real defect. The derivation mapping in V87 was written from the
 * indicator catalogue as an earlier migration left it, and V40 had since repurposed three of those
 * ids: IND-BR-07 and IND-BR-14 became Corporate Social Investment in MYR, IND-BR-12 became
 * Municipal Fresh Water Intake in m3. Marking them DERIVED against percentage formulas would have
 * printed "Municipal Fresh Water Intake: 75 m3" where 75 was a percentage of sites - a wrong
 * number under a right-looking label, which is the exact failure this whole feature exists to
 * prevent. Nothing caught it, because every other test checks the formulas in isolation.
 *
 * <p>A formula now declares the unit it produces, and this test refuses any definition whose own
 * unit disagrees. Matching an id to a formula by memory cannot survive it.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("isolation-test")
@EnabledIf("postgresIsReachable")
class DerivationCatalogueUnitsTest {

    static boolean postgresIsReachable() {
        try (var ignored = DriverManager.getConnection(
                "jdbc:postgresql://localhost:5432/wesee_esg_test",
                System.getenv().getOrDefault("DB_USERNAME", "postgres"),
                System.getenv().getOrDefault("DB_PASSWORD", "root"))) {
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Autowired
    private IndicatorDefinitionRepository definitionRepository;

    @Test
    void everyDerivedDefinitionCarriesTheUnitItsFormulaProduces() {
        List<String> mismatches = new ArrayList<>();
        for (IndicatorDefinition def : definitionRepository.findByAggregationRule(AggregationRule.DERIVED)) {
            String produced = DerivationRegistry.get(def.getDerivationKey()).outputUnit();
            if (!produced.equalsIgnoreCase(def.getUnit())) {
                mismatches.add(def.getId() + " \"" + def.getName() + "\" is recorded in "
                        + def.getUnit() + " but " + def.getDerivationKey() + " produces " + produced);
            }
        }
        assertTrue(mismatches.isEmpty(), "Derived indicators whose unit disagrees with their formula:\n  "
                + String.join("\n  ", mismatches));
    }

    /**
     * A formula nothing points at is dead weight that still passes every unit test, which is how
     * HCV_SITE_PROXIMITY survived after V40 deleted the only indicator it could serve.
     */
    @Test
    void everyFormulaInTheRegistryIsUsedByAtLeastOneDefinition() {
        List<String> inUse = definitionRepository.findDistinctDerivationKeys();
        List<String> orphans = DerivationRegistry.keys().stream()
                .filter(k -> !inUse.contains(k))
                .toList();
        assertTrue(orphans.isEmpty(),
                "Formulas in the registry that no indicator uses: " + String.join(", ", orphans));
    }
}
