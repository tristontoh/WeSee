# Derived Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute the platform's ratio indicators from inputs it holds, with the arithmetic on screen — so `IND-WAT-02` can no longer hold 103%.

**Architecture:** A fifth value, `DERIVED`, on the existing `AggregationRule` enum, which already decides per definition whether an annual value is typed or computed and already makes `IndicatorService.setValue` refuse a manual write to a computed indicator. Thirteen derivations live in a registry of named, unit-tested pure functions keyed by a `derivation_key` column on `indicator_definition` — not a runtime expression parser. Inputs come from existing indicator values and from the denominator layer.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Flyway, JPA/Hibernate, JUnit 5, React 19 + Vite 6 + TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-10-derived-indicators-design.md`

**Depends on:** `docs/superpowers/plans/2026-10-10-denominator-layer.md` must be complete. Without `company_annual_figure` and the board roster there is nothing to divide by and eleven of the thirteen derivations cannot be built.

## Global Constraints

- Copyright header on every new `.java` / `.ts` / `.tsx` file:
  ```
  /*
   * Copyright (c) 2026 Triston Toh. All rights reserved.
   * See LICENSE at the repository root — visibility is not a licence to use.
   */
  ```
- Migration version V87, after the denominator layer's V84–V86.
- `ddl-auto: validate` — entity fields must match columns exactly or the app fails to start.
- All arithmetic in `BigDecimal` with `RoundingMode.HALF_UP`, matching `UnitConverter`. **Rates carry scale 4, percentages scale 2.**
- Unit conversion goes through the existing `com.wesee.esg.extraction.UnitConverter`. Do not write a second one.
- Tests are plain JUnit 5 with no Spring context, matching `UnitConverterTest`.
- Never overwrite an existing stored indicator value during migration. The 103% stays, flagged.
- Build: `cd backend && mvn -q compile`. Tests: `cd backend && mvn -q test -Dtest=ClassName`.

## Review Focus

Five things the spec implies but no obvious task tests. Each has its test assigned to the owning task.

1. **An input recorded in a different unit than the formula expects.** `IND-ENG-01` is MWh and energy intensity is MWh/RM mil, but a tenant may have entered kWh. Expect conversion through `UnitConverter`, not a number 1000× wrong. → Task 2.
2. **Both inputs present but the numerator is zero.** Zero female directors, zero lost-time injuries. Expect `0.00`, computed and stated — not `AWAITING_INPUTS`, which would read as "we don't know" when the company does know. → Task 2.
3. **An input value whose own `status` is `DRAFT` rather than approved.** A derived figure computed from unapproved inputs must itself be `DRAFT`, never inherit approval. → Task 4.
4. **A derived indicator for a fiscal year that has an active sign-off.** Recomputing must not silently alter a signed figure. Expect the sign-off marked stale and the change recorded. → Task 4.
5. **A derivation whose definition is marked `DERIVED` but whose `derivation_key` names nothing in the registry.** A typo in a migration, or a key removed from the registry while a row still references it. Expect a named startup failure, not a null at request time. → Task 3.

---

### Task 1: The migration and the enum value

**Files:**
- Modify: `backend/src/main/java/com/wesee/esg/reference/AggregationRule.java`
- Create: `backend/src/main/resources/db/migration/V87__derived_indicators.sql`
- Create: `backend/src/main/java/com/wesee/esg/indicators/DerivationState.java`
- Modify: `backend/src/main/java/com/wesee/esg/reference/IndicatorDefinition.java`
- Modify: `backend/src/main/java/com/wesee/esg/indicators/IndicatorValue.java`

**Interfaces:**
- Produces: `AggregationRule.DERIVED`; `IndicatorDefinition.getDerivationKey()`/`setDerivationKey(String)`; `DerivationState` enum (`COMPUTED`, `AWAITING_INPUTS`, `SUPERSEDED_MANUAL`); `IndicatorValue.getDerivationState()`/`setDerivationState(DerivationState)`

- [ ] **Step 1: Check what the `aggregation_rule` column constrains**

Run: `grep -rn "aggregation_rule" backend/src/main/resources/db/migration/*.sql`

If the column carries a `CHECK (aggregation_rule IN (...))` constraint, V87 must drop and recreate it including `DERIVED`. If it does not, no constraint work is needed. Write what you find into V87's comment so the next reader knows why the migration does or does not touch it.

- [ ] **Step 2: Add the enum value**

In `AggregationRule.java`, add `DERIVED` and extend the class javadoc:

```java
/**
 * How an indicator's disclosure-facing annual {@code IndicatorValue} is derived from its monthly
 * entries: SUM/COUNT for flow and event metrics (energy, emissions, waste, incidents), LATEST for
 * point-in-time snapshots (headcount, board composition), AVERAGE for rate metrics. DIRECT_ANNUAL
 * indicators have no natural monthly data and are entered directly as an annual figure instead.
 *
 * <p>DERIVED indicators are computed from other indicators and from the per-fiscal-year figures in
 * {@code company_annual_figure}, by the named function their {@code derivation_key} points at. They
 * are never entered by hand — {@link com.wesee.esg.indicators.IndicatorService#setValue} refuses a
 * manual write to any rule but DIRECT_ANNUAL, and that refusal is what makes a ratio trustworthy.
 */
public enum AggregationRule {
    SUM,
    LATEST,
    AVERAGE,
    COUNT,
    DIRECT_ANNUAL,
    DERIVED
}
```

- [ ] **Step 3: Write the migration**

`backend/src/main/resources/db/migration/V87__derived_indicators.sql`:

```sql
-- Ratio indicators stop being free-text fields. IND-WAT-02 currently holds 103% for a percentage
-- that cannot exceed 100 — that is what a ratio looks like when nothing checks its inputs.
--
-- The extension point already existed: aggregation_rule decides per definition whether an annual
-- value is typed or computed, and IndicatorService.setValue already refuses manual writes to a
-- computed indicator. This adds a fifth value to that enum rather than a parallel mechanism.
--
-- Existing typed values are NOT overwritten. They keep their number and are flagged
-- SUPERSEDED_MANUAL, so a user who signed off a year against a typed figure still sees what they
-- signed. The 103% is evidence of the problem; erasing it would hide what this change fixes.

ALTER TABLE indicator_definition ADD COLUMN derivation_key VARCHAR(50);

ALTER TABLE indicator_definition ADD CONSTRAINT indicator_definition_derivation_consistent CHECK (
    (aggregation_rule = 'DERIVED' AND derivation_key IS NOT NULL)
    OR (aggregation_rule <> 'DERIVED' AND derivation_key IS NULL)
);

ALTER TABLE indicator_value ADD COLUMN derivation_state VARCHAR(20);

-- Carbon intensity has no definition in the catalogue, and it is the headline intensity metric
-- every framework asks for. Its two inputs are the figures this platform is already best at
-- producing, so it costs one row to add and nothing to maintain.
INSERT INTO indicator_definition (id, name, unit, matter_id, category, is_sector_specific, aggregation_rule, derivation_key)
SELECT 'IND-ENG-04', 'Carbon Intensity per Revenue', 'tCO2e/RM mil', d.matter_id, d.category, FALSE, 'DERIVED', 'CARBON_INTENSITY_REVENUE'
FROM indicator_definition d WHERE d.id = 'IND-ENG-02';

-- The thirteen derivations. BR-01/BR-12, BR-03/BR-17 and the rest are the same metric listed once
-- for Bursa Main and once for ACE; one formula key serves both copies.
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'ENERGY_INTENSITY_REVENUE'      WHERE id IN ('IND-BR-05', 'IND-BR-13');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'FEMALE_BOARD_RATIO'            WHERE id IN ('IND-BR-03', 'IND-BR-17');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'LOST_TIME_INCIDENT_RATE'       WHERE id IN ('IND-BR-04', 'IND-BR-18');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'WASTE_DIVERTED_RATE'           WHERE id IN ('IND-BR-06', 'IND-BR-14');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'ANTICORRUPTION_TRAINING_RATE'  WHERE id IN ('IND-BR-08', 'IND-BR-15', 'IND-GOV-01');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'SUPPLIER_ASSESSMENT_RATE'      WHERE id IN ('IND-BR-11', 'IND-BR-20');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'CLIMATE_RISK_SITE_COVERAGE'    WHERE id IN ('IND-BR-01', 'IND-BR-12');
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'HCV_SITE_PROXIMITY'            WHERE id = 'IND-BR-07';
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'TRAINING_HOURS_PER_EMPLOYEE'   WHERE id = 'IND-LAB-01';
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'VOLUNTARY_TURNOVER_RATE'       WHERE id = 'IND-LAB-02';
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'WATER_RECYCLING_RATE'          WHERE id = 'IND-WAT-02';
UPDATE indicator_definition SET aggregation_rule = 'DERIVED', derivation_key = 'MATERIAL_CONVERSION_RATE'      WHERE id = 'IND-SEC-MFG-01';

-- Every value already stored against a now-derived indicator keeps its number and says so.
UPDATE indicator_value v
SET derivation_state = 'SUPERSEDED_MANUAL'
FROM indicator_definition d
WHERE d.id = v.indicator_definition_id
  AND d.aggregation_rule = 'DERIVED';
```

- [ ] **Step 4: Write `DerivationState`**

`backend/src/main/java/com/wesee/esg/indicators/DerivationState.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators;

/**
 * Where a derived indicator's annual value came from. Null for every indicator that is not
 * {@code DERIVED}, which is most of the catalogue.
 */
public enum DerivationState {

    /** Computed from inputs the platform holds. The arithmetic is in the audit entry. */
    COMPUTED,

    /**
     * At least one input is missing, so nothing was computed. Deliberately not zero and not the
     * prior year: a defaulted denominator produces a plausible number that flows through sign-off
     * into a signed disclosure, which is the failure this product exists to prevent.
     */
    AWAITING_INPUTS,

    /**
     * A number typed in before this indicator became derived. Kept, not overwritten — somebody may
     * have signed off a year against it, and erasing it would rewrite their history silently.
     */
    SUPERSEDED_MANUAL
}
```

- [ ] **Step 5: Add the entity fields**

In `IndicatorDefinition.java`:

```java
    @Column(name = "derivation_key", length = 50)
    private String derivationKey;
```

In `IndicatorValue.java`:

```java
    @Enumerated(EnumType.STRING)
    @Column(name = "derivation_state", length = 20)
    private DerivationState derivationState;
```

(Check `IndicatorValue.java` for whether it already imports `EnumType`/`Enumerated` — `IndicatorValueStatus` is mapped the same way.)

- [ ] **Step 6: Compile**

Run: `cd backend && mvn -q compile`
Expected: BUILD SUCCESS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V87__derived_indicators.sql \
        backend/src/main/java/com/wesee/esg/reference/AggregationRule.java \
        backend/src/main/java/com/wesee/esg/reference/IndicatorDefinition.java \
        backend/src/main/java/com/wesee/esg/indicators/
git commit -m "feat(indicators): mark the ratio indicators as derived

A fifth value on an enum that already meant 'typed or computed', not a
parallel mechanism. Existing typed values keep their number and are
flagged SUPERSEDED_MANUAL — the 103% in IND-WAT-02 is the evidence this
change exists to fix, and erasing it would hide that."
```

---

### Task 2: The derivation registry

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/indicators/derivation/DerivationInputs.java`
- Create: `backend/src/main/java/com/wesee/esg/indicators/derivation/DerivationResult.java`
- Create: `backend/src/main/java/com/wesee/esg/indicators/derivation/Derivation.java`
- Create: `backend/src/main/java/com/wesee/esg/indicators/derivation/Ratios.java`
- Create: `backend/src/main/java/com/wesee/esg/indicators/derivation/DerivationRegistry.java`
- Test: `backend/src/test/java/com/wesee/esg/indicators/derivation/RatiosTest.java`
- Test: `backend/src/test/java/com/wesee/esg/indicators/derivation/DerivationRegistryTest.java`

**Interfaces:**
- Consumes: `AnnualFigureKey` (denominator plan Task 1), `BoardComposition` (denominator plan Task 5), `com.wesee.esg.extraction.UnitConverter`
- Produces:
  - `DerivationInputs` — a record carrying `Map<String, BigDecimal> indicatorValues`, `Map<String, String> indicatorUnits`, `Map<AnnualFigureKey, BigDecimal> figures`, `List<BoardMember> board`; with lookup helpers `indicator(String id, String expectedUnit)` → `BigDecimal` or null, and `figure(AnnualFigureKey)` → `BigDecimal` or null
  - `DerivationResult` — `record DerivationResult(BigDecimal value, DerivationState state, String explanation, List<String> missing)` plus static factories `computed(BigDecimal, String)`, `awaiting(List<String>)`, `refused(String)`
  - `Ratios.percentage(BigDecimal numerator, BigDecimal denominator)` → `BigDecimal` scale 2; `Ratios.rate(BigDecimal, BigDecimal)` → scale 4; `Ratios.perHundredThousandHours(BigDecimal injuries, BigDecimal hours)` → scale 4
  - `Derivation` — a functional interface: `DerivationResult compute(DerivationInputs inputs)`, plus `String formula()` and `List<String> inputLabels()`
  - `DerivationRegistry.get(String key)` → `Derivation`, throws `IllegalStateException` on an unknown key; `DerivationRegistry.keys()` → `Set<String>`

This task carries Review Focus items 1 and 2.

- [ ] **Step 1: Write the failing arithmetic test**

`backend/src/test/java/com/wesee/esg/indicators/derivation/RatiosTest.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RatiosTest {

    @Test
    void aPercentageCarriesTwoDecimals() {
        assertEquals(new BigDecimal("33.33"), Ratios.percentage(new BigDecimal("1"), new BigDecimal("3")));
    }

    @Test
    void aPercentageRoundsHalfUp() {
        assertEquals(new BigDecimal("12.35"), Ratios.percentage(new BigDecimal("12.345"), new BigDecimal("100")));
    }

    @Test
    void aRateCarriesFourDecimals() {
        assertEquals(new BigDecimal("20.3636"), Ratios.rate(new BigDecimal("977.35"), new BigDecimal("48")));
    }

    /** Review Focus 2. Zero of something the company counted is a fact, not a gap. */
    @Test
    void aZeroNumeratorComputesZeroRatherThanNothing() {
        assertEquals(new BigDecimal("0.00"), Ratios.percentage(BigDecimal.ZERO, new BigDecimal("50")));
        assertEquals(new BigDecimal("0.0000"), Ratios.rate(BigDecimal.ZERO, new BigDecimal("50")));
    }

    @Test
    void aZeroDenominatorYieldsNullRatherThanInfinityOrAnException() {
        assertNull(Ratios.percentage(new BigDecimal("5"), BigDecimal.ZERO));
        assertNull(Ratios.rate(new BigDecimal("5"), BigDecimal.ZERO));
    }

    @Test
    void aNullInputYieldsNull() {
        assertNull(Ratios.percentage(null, new BigDecimal("50")));
        assertNull(Ratios.percentage(new BigDecimal("5"), null));
    }

    @Test
    void lostTimeIncidentRateUsesTheTwoHundredThousandHourBase() {
        // 3 injuries over 1,200,000 hours = 0.5 per 200,000 hours
        assertEquals(new BigDecimal("0.5000"),
                Ratios.perHundredThousandHours(new BigDecimal("3"), new BigDecimal("1200000")));
    }

    @Test
    void aFullPercentageIsExactlyOneHundred() {
        assertEquals(new BigDecimal("100.00"), Ratios.percentage(new BigDecimal("50"), new BigDecimal("50")));
    }

    @Test
    void aPercentageAboveOneHundredIsRefusedRatherThanClamped() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                Ratios.percentage(new BigDecimal("60"), new BigDecimal("50")));
        assertTrue(e.getMessage().contains("60"), e.getMessage());
        assertTrue(e.getMessage().contains("50"), e.getMessage());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=RatiosTest`
Expected: FAIL — `Ratios` does not exist.

- [ ] **Step 3: Write `Ratios`**

`backend/src/main/java/com/wesee/esg/indicators/derivation/Ratios.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * The arithmetic every derivation shares. One place, because inconsistency here is how a ratio
 * becomes 103% — which is what {@code IND-WAT-02} held before these rules existed.
 */
public final class Ratios {

    public static final int PERCENTAGE_SCALE = 2;
    public static final int RATE_SCALE = 4;

    /** The OSHA/Bursa convention: incidents per 200,000 hours, roughly 100 full-time years. */
    private static final BigDecimal LTI_BASE_HOURS = new BigDecimal("200000");

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private Ratios() {
    }

    /**
     * A percentage, bounded at 100. Exceeding it means an input is wrong, so this refuses and names
     * the two numbers rather than clamping — a clamped 100 would hide the bad data behind a
     * plausible figure, which is exactly how a 103% gets signed off.
     */
    public static BigDecimal percentage(BigDecimal numerator, BigDecimal denominator) {
        if (numerator == null || denominator == null || denominator.signum() == 0) {
            return null;
        }
        BigDecimal result = numerator.multiply(ONE_HUNDRED)
                .divide(denominator, PERCENTAGE_SCALE, RoundingMode.HALF_UP);
        if (result.compareTo(ONE_HUNDRED) > 0) {
            throw new IllegalArgumentException(
                    numerator.toPlainString() + " of " + denominator.toPlainString()
                            + " is " + result.toPlainString() + "% — a percentage cannot exceed 100,"
                            + " so one of those two numbers is wrong");
        }
        return result;
    }

    /** An unbounded ratio: intensity, hours per head. Nothing caps these, so nothing checks one. */
    public static BigDecimal rate(BigDecimal numerator, BigDecimal denominator) {
        if (numerator == null || denominator == null || denominator.signum() == 0) {
            return null;
        }
        return numerator.divide(denominator, RATE_SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal perHundredThousandHours(BigDecimal injuries, BigDecimal hoursWorked) {
        if (injuries == null || hoursWorked == null || hoursWorked.signum() == 0) {
            return null;
        }
        return injuries.multiply(LTI_BASE_HOURS)
                .divide(hoursWorked, RATE_SCALE, RoundingMode.HALF_UP);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=RatiosTest`
Expected: PASS, 9 tests.

- [ ] **Step 5: Write `DerivationInputs`, `DerivationResult` and `Derivation`**

`DerivationInputs.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.denominator.AnnualFigureKey;
import com.wesee.esg.denominator.BoardMember;
import com.wesee.esg.extraction.UnitConverter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Everything one derivation may read, for one company and one fiscal year. Assembled once by the
 * service and handed to a pure function, so every derivation is unit-testable without a database.
 */
public record DerivationInputs(
        Map<String, BigDecimal> indicatorValues,
        Map<String, String> indicatorUnits,
        Map<AnnualFigureKey, BigDecimal> figures,
        List<BoardMember> board
) {

    /**
     * An indicator's value, converted to the unit the formula expects. A tenant may have entered
     * electricity in kWh where the formula wants MWh; returning the raw number would be wrong by a
     * factor of a thousand and look entirely reasonable on a chart.
     */
    public BigDecimal indicator(String indicatorId, String expectedUnit) {
        BigDecimal raw = indicatorValues.get(indicatorId);
        if (raw == null) {
            return null;
        }
        String actualUnit = indicatorUnits.get(indicatorId);
        if (actualUnit == null || actualUnit.equalsIgnoreCase(expectedUnit)) {
            return raw;
        }
        return UnitConverter.convert(raw, actualUnit, expectedUnit);
    }

    public BigDecimal figure(AnnualFigureKey key) {
        return figures.get(key);
    }
}
```

`DerivationResult.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.indicators.DerivationState;

import java.math.BigDecimal;
import java.util.List;

/**
 * What a derivation produced: a number and the arithmetic that made it, or a list of what is
 * missing. The explanation is written for an assurer reading the audit trail — "977.35 / 48.0 =
 * 20.36", with both inputs named, not the word "computed".
 */
public record DerivationResult(
        BigDecimal value,
        DerivationState state,
        String explanation,
        List<String> missing
) {

    public static DerivationResult computed(BigDecimal value, String explanation) {
        return new DerivationResult(value, DerivationState.COMPUTED, explanation, List.of());
    }

    public static DerivationResult awaiting(List<String> missing) {
        return new DerivationResult(null, DerivationState.AWAITING_INPUTS, null, List.copyOf(missing));
    }
}
```

`Derivation.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

/**
 * One named formula. A registry of these rather than an expression parsed at runtime: an evaluator
 * would be a new attack surface and a new class of silent wrong answers, for thirteen formulas
 * that change about once a decade.
 */
public interface Derivation {

    /** The arithmetic, or an account of what is missing. Pure — no repository, no clock. */
    DerivationResult compute(DerivationInputs inputs);

    /** Shown on the indicator screen, e.g. "Scope 1 + Scope 2 / revenue". */
    String formula();
}
```

- [ ] **Step 6: Write the failing registry test**

`backend/src/test/java/com/wesee/esg/indicators/derivation/DerivationRegistryTest.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.denominator.AnnualFigureKey;
import com.wesee.esg.denominator.BoardMember;
import com.wesee.esg.indicators.DerivationState;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DerivationRegistryTest {

    private static DerivationInputs inputs(Map<String, BigDecimal> indicators,
                                           Map<String, String> units,
                                           Map<AnnualFigureKey, BigDecimal> figures,
                                           List<BoardMember> board) {
        return new DerivationInputs(indicators, units, figures, board);
    }

    private static BoardMember director(String name, String gender) {
        BoardMember m = new BoardMember();
        m.setName(name);
        m.setGender(gender);
        m.setIndependent(false);
        return m;
    }

    @Test
    void theRegistryHoldsThirteenDerivations() {
        assertEquals(13, DerivationRegistry.keys().size());
    }

    /** Review Focus 5. A key in a migration that names nothing must fail loudly. */
    @Test
    void anUnknownKeyThrowsRatherThanReturningNull() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> DerivationRegistry.get("NO_SUCH_FORMULA"));
        assertTrue(e.getMessage().contains("NO_SUCH_FORMULA"), e.getMessage());
    }

    @Test
    void everyDerivationDeclaresItsFormula() {
        for (String key : DerivationRegistry.keys()) {
            assertTrue(DerivationRegistry.get(key).formula() != null
                    && !DerivationRegistry.get(key).formula().isBlank(), key + " has no formula text");
        }
    }

    @Test
    void energyIntensityDividesElectricityByRevenue() {
        DerivationResult r = DerivationRegistry.get("ENERGY_INTENSITY_REVENUE").compute(inputs(
                Map.of("IND-ENG-01", new BigDecimal("912.4460")),
                Map.of("IND-ENG-01", "MWh"),
                Map.of(AnnualFigureKey.REVENUE, new BigDecimal("48.0000")),
                List.of()));
        assertEquals(DerivationState.COMPUTED, r.state());
        assertEquals(new BigDecimal("19.0093"), r.value());
        assertTrue(r.explanation().contains("912.4460"), r.explanation());
        assertTrue(r.explanation().contains("48.0000"), r.explanation());
    }

    /** Review Focus 1. kWh entered where the formula wants MWh must convert, not be 1000x wrong. */
    @Test
    void energyIntensityConvertsAnInputRecordedInKilowattHours() {
        DerivationResult r = DerivationRegistry.get("ENERGY_INTENSITY_REVENUE").compute(inputs(
                Map.of("IND-ENG-01", new BigDecimal("912446")),
                Map.of("IND-ENG-01", "kWh"),
                Map.of(AnnualFigureKey.REVENUE, new BigDecimal("48.0000")),
                List.of()));
        assertEquals(new BigDecimal("19.0093"), r.value());
    }

    @Test
    void carbonIntensitySumsBothScopesBeforeDividing() {
        DerivationResult r = DerivationRegistry.get("CARBON_INTENSITY_REVENUE").compute(inputs(
                Map.of("IND-ENG-02", new BigDecimal("443.5600"),
                       "IND-ENG-03", new BigDecimal("533.7800")),
                Map.of("IND-ENG-02", "tCO2e", "IND-ENG-03", "tCO2e"),
                Map.of(AnnualFigureKey.REVENUE, new BigDecimal("48.0000")),
                List.of()));
        // 443.56 + 533.78 = 977.34, / 48 = 20.3613
        assertEquals(new BigDecimal("20.3613"), r.value());
    }

    @Test
    void aMissingDenominatorReportsWhichFigureIsWanted() {
        DerivationResult r = DerivationRegistry.get("ENERGY_INTENSITY_REVENUE").compute(inputs(
                Map.of("IND-ENG-01", new BigDecimal("912.4460")),
                Map.of("IND-ENG-01", "MWh"),
                Map.of(),
                List.of()));
        assertEquals(DerivationState.AWAITING_INPUTS, r.state());
        assertNull(r.value());
        assertEquals(1, r.missing().size());
        assertTrue(r.missing().get(0).toLowerCase().contains("revenue"), r.missing().toString());
    }

    @Test
    void twoMissingInputsAreBothNamed() {
        DerivationResult r = DerivationRegistry.get("ENERGY_INTENSITY_REVENUE")
                .compute(inputs(Map.of(), Map.of(), Map.of(), List.of()));
        assertEquals(DerivationState.AWAITING_INPUTS, r.state());
        assertEquals(2, r.missing().size());
    }

    @Test
    void femaleBoardRatioCountsTheRoster() {
        DerivationResult r = DerivationRegistry.get("FEMALE_BOARD_RATIO").compute(inputs(
                Map.of(), Map.of(), Map.of(),
                List.of(director("A", "FEMALE"), director("B", "MALE"),
                        director("C", "MALE"), director("D", "FEMALE"))));
        assertEquals(new BigDecimal("50.00"), r.value());
    }

    @Test
    void anEmptyBoardIsAwaitingInputsRatherThanDividingByZero() {
        DerivationResult r = DerivationRegistry.get("FEMALE_BOARD_RATIO")
                .compute(inputs(Map.of(), Map.of(), Map.of(), List.of()));
        assertEquals(DerivationState.AWAITING_INPUTS, r.state());
    }

    @Test
    void lostTimeIncidentRateUsesInjuriesAndHours() {
        DerivationResult r = DerivationRegistry.get("LOST_TIME_INCIDENT_RATE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.LOST_TIME_INJURIES, new BigDecimal("3"),
                       AnnualFigureKey.TOTAL_HOURS_WORKED, new BigDecimal("1200000")),
                List.of()));
        assertEquals(new BigDecimal("0.5000"), r.value());
    }

    @Test
    void wasteDivertedSubtractsLandfilledFromGenerated() {
        DerivationResult r = DerivationRegistry.get("WASTE_DIVERTED_RATE").compute(inputs(
                Map.of("IND-WST-01", new BigDecimal("200"), "IND-WST-02", new BigDecimal("50")),
                Map.of("IND-WST-01", "Tonnes", "IND-WST-02", "Tonnes"),
                Map.of(), List.of()));
        assertEquals(new BigDecimal("75.00"), r.value());
    }

    @Test
    void wasteDivertedRefusesWhenMoreWasLandfilledThanGenerated() {
        assertThrows(IllegalArgumentException.class, () ->
                DerivationRegistry.get("WASTE_DIVERTED_RATE").compute(inputs(
                        Map.of("IND-WST-01", new BigDecimal("50"), "IND-WST-02", new BigDecimal("200")),
                        Map.of("IND-WST-01", "Tonnes", "IND-WST-02", "Tonnes"),
                        Map.of(), List.of())));
    }

    @Test
    void voluntaryTurnoverDividesDeparturesByHeadcount() {
        DerivationResult r = DerivationRegistry.get("VOLUNTARY_TURNOVER_RATE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.EMPLOYEE_DEPARTURES, new BigDecimal("6"),
                       AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("50")),
                List.of()));
        assertEquals(new BigDecimal("12.00"), r.value());
    }

    @Test
    void trainingHoursPerEmployeeIsARateNotAPercentage() {
        DerivationResult r = DerivationRegistry.get("TRAINING_HOURS_PER_EMPLOYEE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.TOTAL_TRAINING_HOURS, new BigDecimal("1250"),
                       AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("50")),
                List.of()));
        assertEquals(new BigDecimal("25.0000"), r.value());
    }

    /**
     * The test that decides whether this ships. IND-WAT-02 holds 103% today. Recycled water
     * exceeding what a recycling rate can mean must be refused and both inputs named — a clamp to
     * 100 would hide the bad data behind a figure that looks fine.
     */
    @Test
    void waterRecyclingRefusesAnImpossibleRateAndNamesBothInputs() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                DerivationRegistry.get("WATER_RECYCLING_RATE").compute(inputs(
                        Map.of("IND-WAT-01", new BigDecimal("-100")),
                        Map.of("IND-WAT-01", "m3"),
                        Map.of(AnnualFigureKey.RECYCLED_WATER_VOLUME, new BigDecimal("500")),
                        List.of())));
        assertTrue(e.getMessage().contains("500"), e.getMessage());
    }

    @Test
    void waterRecyclingDividesRecycledByTheTotalItIsPartOf() {
        DerivationResult r = DerivationRegistry.get("WATER_RECYCLING_RATE").compute(inputs(
                Map.of("IND-WAT-01", new BigDecimal("750")),
                Map.of("IND-WAT-01", "m3"),
                Map.of(AnnualFigureKey.RECYCLED_WATER_VOLUME, new BigDecimal("250")),
                List.of()));
        // 250 / (250 + 750) = 25%
        assertEquals(new BigDecimal("25.00"), r.value());
    }

    @Test
    void siteCoverageDividesAssessedSitesByTotalSites() {
        DerivationResult r = DerivationRegistry.get("CLIMATE_RISK_SITE_COVERAGE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.SITES_CLIMATE_RISK_ASSESSED, new BigDecimal("3"),
                       AnnualFigureKey.OPERATIONAL_SITES, new BigDecimal("4")),
                List.of()));
        assertEquals(new BigDecimal("75.00"), r.value());
    }

    @Test
    void supplierAssessmentDividesAssessedByTierOneCount() {
        DerivationResult r = DerivationRegistry.get("SUPPLIER_ASSESSMENT_RATE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.TIER1_SUPPLIERS_ASSESSED, new BigDecimal("18"),
                       AnnualFigureKey.TIER1_SUPPLIERS, new BigDecimal("24")),
                List.of()));
        assertEquals(new BigDecimal("75.00"), r.value());
    }

    @Test
    void anticorruptionTrainingDividesTrainedByHeadcount() {
        DerivationResult r = DerivationRegistry.get("ANTICORRUPTION_TRAINING_RATE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.EMPLOYEES_TRAINED_ANTICORRUPTION, new BigDecimal("45"),
                       AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("50")),
                List.of()));
        assertEquals(new BigDecimal("90.00"), r.value());
    }

    @Test
    void materialConversionDividesConvertedByInput() {
        DerivationResult r = DerivationRegistry.get("MATERIAL_CONVERSION_RATE").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.RAW_MATERIAL_CONVERTED, new BigDecimal("880"),
                       AnnualFigureKey.RAW_MATERIAL_INPUT, new BigDecimal("1000")),
                List.of()));
        assertEquals(new BigDecimal("88.00"), r.value());
    }

    @Test
    void highConservationValueProximityDividesBySites() {
        DerivationResult r = DerivationRegistry.get("HCV_SITE_PROXIMITY").compute(inputs(
                Map.of(), Map.of(),
                Map.of(AnnualFigureKey.SITES_NEAR_HIGH_CONSERVATION_VALUE, new BigDecimal("1"),
                       AnnualFigureKey.OPERATIONAL_SITES, new BigDecimal("4")),
                List.of()));
        assertEquals(new BigDecimal("25.00"), r.value());
    }

    @Test
    void everyDerivationWithNoInputsAtAllIsAwaitingRatherThanThrowing() {
        DerivationInputs empty = inputs(Map.of(), Map.of(), Map.of(), List.of());
        for (String key : DerivationRegistry.keys()) {
            DerivationResult r = DerivationRegistry.get(key).compute(empty);
            assertEquals(DerivationState.AWAITING_INPUTS, r.state(), key + " did not report awaiting");
            assertTrue(!r.missing().isEmpty(), key + " reported awaiting without naming anything");
        }
    }
}
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=DerivationRegistryTest`
Expected: FAIL — `DerivationRegistry` does not exist.

- [ ] **Step 8: Write the registry**

`backend/src/main/java/com/wesee/esg/indicators/derivation/DerivationRegistry.java` — a `Map<String, Derivation>` built in a static initialiser, one entry per key below. Each derivation follows the same shape: collect inputs, return `DerivationResult.awaiting(missing)` if any are null, otherwise compute through `Ratios` and return `DerivationResult.computed(value, explanation)` where the explanation shows the actual numbers.

A helper keeps the thirteen entries readable:

```java
    /** Two figures in, one ratio out — the shape eight of the thirteen derivations take. */
    private static Derivation figureRatio(String formula,
                                          AnnualFigureKey numeratorKey, String numeratorLabel,
                                          AnnualFigureKey denominatorKey, String denominatorLabel,
                                          boolean asPercentage) {
        return new Derivation() {
            @Override
            public DerivationResult compute(DerivationInputs inputs) {
                BigDecimal numerator = inputs.figure(numeratorKey);
                BigDecimal denominator = inputs.figure(denominatorKey);
                List<String> missing = new ArrayList<>();
                if (numerator == null) {
                    missing.add(numeratorLabel);
                }
                if (denominator == null) {
                    missing.add(denominatorLabel);
                }
                if (!missing.isEmpty()) {
                    return DerivationResult.awaiting(missing);
                }
                BigDecimal value = asPercentage
                        ? Ratios.percentage(numerator, denominator)
                        : Ratios.rate(numerator, denominator);
                if (value == null) {
                    return DerivationResult.awaiting(List.of(denominatorLabel + " is zero"));
                }
                return DerivationResult.computed(value,
                        numerator.toPlainString() + " ÷ " + denominator.toPlainString()
                                + (asPercentage ? " × 100 = " : " = ") + value.toPlainString());
            }

            @Override
            public String formula() {
                return formula;
            }
        };
    }
```

The thirteen entries:

| Key | Built with | Inputs |
|---|---|---|
| `ENERGY_INTENSITY_REVENUE` | bespoke | `indicator("IND-ENG-01", "MWh")` ÷ `figure(REVENUE)`, rate |
| `CARBON_INTENSITY_REVENUE` | bespoke | (`IND-ENG-02` + `IND-ENG-03`, both "tCO2e") ÷ `figure(REVENUE)`, rate |
| `FEMALE_BOARD_RATIO` | bespoke | `BoardComposition.femaleCount(board)` ÷ `directorCount(board)`, percentage; empty roster → awaiting "board roster" |
| `LOST_TIME_INCIDENT_RATE` | bespoke | `Ratios.perHundredThousandHours(figure(LOST_TIME_INJURIES), figure(TOTAL_HOURS_WORKED))` |
| `WASTE_DIVERTED_RATE` | bespoke | (`IND-WST-01` − `IND-WST-02`, "Tonnes") ÷ `IND-WST-01`, percentage |
| `ANTICORRUPTION_TRAINING_RATE` | `figureRatio` | `EMPLOYEES_TRAINED_ANTICORRUPTION` ÷ `AVERAGE_HEADCOUNT`, percentage |
| `SUPPLIER_ASSESSMENT_RATE` | `figureRatio` | `TIER1_SUPPLIERS_ASSESSED` ÷ `TIER1_SUPPLIERS`, percentage |
| `CLIMATE_RISK_SITE_COVERAGE` | `figureRatio` | `SITES_CLIMATE_RISK_ASSESSED` ÷ `OPERATIONAL_SITES`, percentage |
| `HCV_SITE_PROXIMITY` | `figureRatio` | `SITES_NEAR_HIGH_CONSERVATION_VALUE` ÷ `OPERATIONAL_SITES`, percentage |
| `TRAINING_HOURS_PER_EMPLOYEE` | `figureRatio` | `TOTAL_TRAINING_HOURS` ÷ `AVERAGE_HEADCOUNT`, rate |
| `VOLUNTARY_TURNOVER_RATE` | `figureRatio` | `EMPLOYEE_DEPARTURES` ÷ `AVERAGE_HEADCOUNT`, percentage |
| `WATER_RECYCLING_RATE` | bespoke | `figure(RECYCLED_WATER_VOLUME)` ÷ (recycled + `indicator("IND-WAT-01", "m3")`), percentage |
| `MATERIAL_CONVERSION_RATE` | `figureRatio` | `RAW_MATERIAL_CONVERTED` ÷ `RAW_MATERIAL_INPUT`, percentage |

And the lookup:

```java
    public static Derivation get(String key) {
        Derivation d = DERIVATIONS.get(key);
        if (d == null) {
            throw new IllegalStateException(
                    "No derivation named '" + key + "'. An indicator definition is marked DERIVED"
                            + " against a formula that does not exist — check the migration that set it.");
        }
        return d;
    }

    public static Set<String> keys() {
        return DERIVATIONS.keySet();
    }
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=DerivationRegistryTest`
Expected: PASS, 22 tests.

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/indicators/derivation/ \
        backend/src/test/java/com/wesee/esg/indicators/derivation/
git commit -m "feat(indicators): thirteen derivations, as pure functions

A registry of named functions, not an expression parser — an evaluator
would be a new attack surface and a new class of silent wrong answers
for thirteen formulas that change once a decade.

A percentage above 100 is refused and both inputs named rather than
clamped. IND-WAT-02's 103% is what a clamp would have hidden."
```

---

### Task 3: Startup validation of the registry against the catalogue

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/indicators/derivation/DerivationCatalogueCheck.java`
- Test: `backend/src/test/java/com/wesee/esg/indicators/derivation/DerivationCatalogueCheckTest.java`

**Interfaces:**
- Consumes: `DerivationRegistry`, `IndicatorDefinitionRepository` (existing — confirm its name with `ls backend/src/main/java/com/wesee/esg/reference/`)
- Produces: `DerivationCatalogueCheck.verify(List<String> derivationKeysInUse)` → void, throws `IllegalStateException` naming every unknown key

This task carries Review Focus item 5.

- [ ] **Step 1: Write the failing test**

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DerivationCatalogueCheckTest {

    @Test
    void keysThatAllExistPass() {
        assertDoesNotThrow(() -> DerivationCatalogueCheck.verify(
                List.of("ENERGY_INTENSITY_REVENUE", "VOLUNTARY_TURNOVER_RATE")));
    }

    @Test
    void anUnknownKeyFailsAndIsNamed() {
        IllegalStateException e = assertThrows(IllegalStateException.class, () ->
                DerivationCatalogueCheck.verify(List.of("ENERGY_INTENSITY_REVENUE", "TYPO_RATE")));
        assertTrue(e.getMessage().contains("TYPO_RATE"), e.getMessage());
        assertTrue(!e.getMessage().contains("ENERGY_INTENSITY_REVENUE"), e.getMessage());
    }

    @Test
    void everyUnknownKeyIsNamedNotJustTheFirst() {
        IllegalStateException e = assertThrows(IllegalStateException.class, () ->
                DerivationCatalogueCheck.verify(List.of("TYPO_ONE", "TYPO_TWO")));
        assertTrue(e.getMessage().contains("TYPO_ONE"), e.getMessage());
        assertTrue(e.getMessage().contains("TYPO_TWO"), e.getMessage());
    }

    @Test
    void anEmptyCatalogueIsFine() {
        assertDoesNotThrow(() -> DerivationCatalogueCheck.verify(List.of()));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=DerivationCatalogueCheckTest`
Expected: FAIL — class does not exist.

- [ ] **Step 3: Write the check and wire it to startup**

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import java.util.List;

/**
 * Every {@code derivation_key} in the catalogue must name something in the registry. A migration
 * typo, or a key removed from the registry while a row still points at it, should stop the
 * application at boot with the bad key named — not return null to a user asking for an indicator.
 */
public final class DerivationCatalogueCheck {

    private DerivationCatalogueCheck() {
    }

    public static void verify(List<String> derivationKeysInUse) {
        List<String> unknown = derivationKeysInUse.stream()
                .filter(k -> !DerivationRegistry.keys().contains(k))
                .distinct()
                .toList();
        if (!unknown.isEmpty()) {
            throw new IllegalStateException(
                    "Indicator definitions are marked DERIVED against formulas that do not exist: "
                            + String.join(", ", unknown)
                            + ". The registry knows: " + String.join(", ", DerivationRegistry.keys()));
        }
    }
}
```

Then wire it: add an `ApplicationRunner` (or `@EventListener(ApplicationReadyEvent.class)`) bean in the `indicators` package that reads every non-null `derivation_key` from `indicator_definition` and calls `verify`. Follow whatever startup-hook pattern the codebase already uses — check with `grep -rn "ApplicationRunner\|ApplicationReadyEvent" backend/src/main/java`. If there is none, an `ApplicationRunner` is the smallest addition.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=DerivationCatalogueCheckTest`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/indicators/derivation/DerivationCatalogueCheck.java \
        backend/src/test/java/com/wesee/esg/indicators/derivation/DerivationCatalogueCheckTest.java \
        backend/src/main/java/com/wesee/esg/indicators/
git commit -m "feat(indicators): fail at boot on a derivation key that names nothing

A migration typo should stop the application with the bad key printed,
not return null to a user asking for an indicator."
```

---

### Task 4: Computing derived values in the service

**Files:**
- Modify: `backend/src/main/java/com/wesee/esg/indicators/IndicatorService.java`
- Create: `backend/src/main/java/com/wesee/esg/indicators/derivation/DerivationService.java`
- Test: `backend/src/test/java/com/wesee/esg/indicators/derivation/DerivationRecomputeTest.java`

**Interfaces:**
- Consumes: `DerivationRegistry`, `CompanyAnnualFigureRepository`, `BoardMemberRepository`, `IndicatorValueRepository`, `IndicatorDefinitionRepository`, `IndicatorAuditEntryRepository`
- Produces: `DerivationService.recompute(UUID companyId, String indicatorDefinitionId, int fiscalYear)` → `DerivationResult`; `DerivationService.recomputeAllDependents(UUID companyId, int fiscalYear)` → `int` (how many changed)

This task carries Review Focus items 3 and 4.

- [ ] **Step 1: Refuse a manual write to a derived indicator**

In `IndicatorService.setValue` the guard at line ~125 already refuses anything but `DIRECT_ANNUAL`, with a message about monthly entries. A `DERIVED` indicator needs its own sentence — "use the monthly entry endpoint instead" is wrong advice for a ratio. Change it to:

```java
        if (def.getAggregationRule() == AggregationRule.DERIVED) {
            throw new ConflictException(
                    "This indicator is computed from its inputs — enter the figures it divides by"
                            + " on the denominators screen, and the value follows");
        }
        if (def.getAggregationRule() != AggregationRule.DIRECT_ANNUAL) {
            throw new ConflictException("This indicator's annual value is computed from monthly entries — use the monthly entry endpoint instead");
        }
```

- [ ] **Step 2: Write the failing recompute test**

`backend/src/test/java/com/wesee/esg/indicators/derivation/DerivationRecomputeTest.java` — tests the decision logic, not the repositories, so extract it as a pure static method on `DerivationService` and test that:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.indicators.DerivationState;
import com.wesee.esg.indicators.IndicatorValueStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DerivationRecomputeTest {

    @Test
    void aNewComputedValueReplacesNothingWhenTheNumberIsUnchanged() {
        assertFalse(DerivationService.isChange(new BigDecimal("25.00"), new BigDecimal("25.00")));
    }

    @Test
    void aDifferentNumberIsAChange() {
        assertTrue(DerivationService.isChange(new BigDecimal("25.00"), new BigDecimal("26.00")));
    }

    @Test
    void trailingZeroesDoNotCountAsAChange() {
        assertTrue(!DerivationService.isChange(new BigDecimal("25.0"), new BigDecimal("25.00")));
    }

    @Test
    void firstComputationOverANullIsAChange() {
        assertTrue(DerivationService.isChange(null, new BigDecimal("25.00")));
    }

    @Test
    void losingAValueBecauseAnInputWasDeletedIsAChange() {
        assertTrue(DerivationService.isChange(new BigDecimal("25.00"), null));
    }

    /** Review Focus 3. A figure computed from unapproved inputs cannot arrive pre-approved. */
    @Test
    void aRecomputedValueIsAlwaysDraft() {
        assertEquals(IndicatorValueStatus.DRAFT, DerivationService.statusAfterRecompute());
    }

    @Test
    void anAwaitingResultClearsTheStoredValue() {
        assertTrue(DerivationService.clearsStoredValue(DerivationState.AWAITING_INPUTS));
        assertFalse(DerivationService.clearsStoredValue(DerivationState.COMPUTED));
    }

    /**
     * A value typed in before the indicator became derived is kept until a real computation can
     * replace it. Clearing it would erase what somebody may have signed off against.
     */
    @Test
    void aSupersededManualValueIsNotClearedByAMissingInput() {
        assertFalse(DerivationService.clearsStoredValue(DerivationState.SUPERSEDED_MANUAL));
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=DerivationRecomputeTest`
Expected: FAIL — `DerivationService` does not exist.

- [ ] **Step 4: Write `DerivationService`**

The pure helpers the test pins:

```java
    /** Scale-insensitive, so 25.0 and 25.00 are the same number and not a spurious revision. */
    static boolean isChange(BigDecimal stored, BigDecimal computed) {
        if (stored == null && computed == null) {
            return false;
        }
        if (stored == null || computed == null) {
            return true;
        }
        return stored.compareTo(computed) != 0;
    }

    /**
     * Always DRAFT. A derived figure may be computed from inputs nobody has approved, so it cannot
     * arrive pre-approved — and a recomputation invalidates a prior approval for the same reason a
     * monthly correction does.
     */
    static IndicatorValueStatus statusAfterRecompute() {
        return IndicatorValueStatus.DRAFT;
    }

    /** A missing input blanks a computed value, but never a figure typed in before derivation. */
    static boolean clearsStoredValue(DerivationState state) {
        return state == DerivationState.AWAITING_INPUTS;
    }
```

And `recompute(UUID companyId, String indicatorDefinitionId, int fiscalYear)`:

1. Load the definition; return immediately if its rule is not `DERIVED`.
2. Assemble `DerivationInputs`: every `IndicatorValue` for the company and year into `indicatorValues`, each definition's `unit` into `indicatorUnits`, every `CompanyAnnualFigure` into `figures`, the `BoardMember` roster into `board`.
3. `DerivationRegistry.get(def.getDerivationKey()).compute(inputs)`.
4. Catch `IllegalArgumentException` from `Ratios` and turn it into an `AWAITING_INPUTS` result whose `missing` holds the exception message — a refused ratio is a data problem the user must see on the indicator, not a 500.
5. Load or create the `IndicatorValue`. If the existing one is `SUPERSEDED_MANUAL` and the result is `AWAITING_INPUTS`, leave it alone. Otherwise write the value, set `derivationState`, set `computed = true`, and if `isChange(...)` set status `DRAFT` and clear `approvedByName`/`approvedAt`.
6. On a change, write an `IndicatorAuditEntry` whose `entered_by` is "Derived" and whose `source_quote` is `result.explanation()` — the audit trail's provenance slot, carrying the arithmetic instead of a document quote.
7. If a sign-off exists for that company and fiscal year and the value changed, mark it stale. Find the existing sign-off entity with `grep -rn "sign_off_record\|SignOffRecord" backend/src/main/java` and follow whatever "invalidate" path the assurance module already has, rather than inventing one.

`recomputeAllDependents(UUID companyId, int fiscalYear)` loads every `DERIVED` definition and calls `recompute` for each, returning how many changed. Call it from `DenominatorService.setFigure` and `.deleteFigure`, from `BoardService`'s member mutations, and at the end of `IndicatorService.setValue`/`recomputeAnnualValue` — a changed input must update what depends on it in the same transaction.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=DerivationRecomputeTest`
Expected: PASS, 8 tests.

- [ ] **Step 6: Run the whole suite**

Run: `cd backend && mvn -q test`
Expected: all tests pass, including the pre-existing `IndicatorServiceComputeAnnualValueTest`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/indicators/ backend/src/test/java/com/wesee/esg/indicators/
git commit -m "feat(indicators): compute derived values, and recompute on input change

A recomputed figure is always DRAFT — it may be built on inputs nobody
approved, so it cannot arrive pre-approved, and a changed input
invalidates a prior approval the same way a monthly correction does.

A refused ratio becomes AWAITING_INPUTS carrying the refusal message,
not a 500: the user needs to see which two numbers disagree."
```

---

### Task 5: Show the arithmetic

**Files:**
- Modify: `backend/src/main/java/com/wesee/esg/indicators/dto/IndicatorResponse.java`
- Modify: `backend/src/main/java/com/wesee/esg/indicators/IndicatorService.java` (the `toResponse` mapper)
- Modify: `frontend/src/components/IndicatorsView.tsx`
- Modify: whichever frontend type file mirrors `IndicatorResponse` (find with `grep -rn "aggregationRule" frontend/src`)

**Interfaces:**
- Consumes: `DerivationResult`, `DerivationState`
- Produces: `IndicatorResponse` gains `String derivationKey`, `String formula`, `DerivationState derivationState`, `String explanation`, `List<String> missingInputs`

- [ ] **Step 1: Extend the response record**

Add the five fields. `formula` comes from `DerivationRegistry.get(key).formula()` when the definition is `DERIVED`, null otherwise. `explanation` and `missingInputs` come from the stored value's last recompute — recompute on read is wrong (it would make a GET write), so persist the explanation in the audit entry at Task 4 Step 6 and read the most recent one here.

- [ ] **Step 2: Render it**

On the indicator detail screen, a `DERIVED` indicator:

- shows the value as read-only, with no input field
- shows the formula under the value
- shows the arithmetic with the actual numbers, from `explanation`
- when `derivationState` is `AWAITING_INPUTS`, shows "Waiting on: <missingInputs joined>" with a link to `#/denominators`
- when `derivationState` is `SUPERSEDED_MANUAL`, shows the stored number with a note that it was entered by hand before this indicator became computed, and what is needed to replace it

- [ ] **Step 3: Build the frontend**

Run: `cd frontend && npm run build`
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/indicators/ frontend/src/
git commit -m "feat(indicators): show the formula, the inputs and the arithmetic

An assurer reading the audit trail sees '977.35 / 48.0 = 20.36' with
both inputs named, not the word 'computed'. The same thing the user
sees on the screen."
```

---

### Task 6: Prove it against the real database

**Files:** none changed unless this finds a problem.

- [ ] **Step 1: Start the stack**

Run: `make infra`, then `cd backend && mvn -q spring-boot:run` in the background.

Expected: V87 applies; `DerivationCatalogueCheck` passes at boot; `ddl-auto: validate` passes.

If startup fails on duplicate classes, run `make tidy` first.

- [ ] **Step 2: Confirm the 103% is flagged, not erased**

```bash
psql -h localhost -U postgres -d wesee_esg -c \
  "SELECT v.indicator_definition_id, v.value, v.derivation_state
     FROM indicator_value v
     JOIN indicator_definition d ON d.id = v.indicator_definition_id
    WHERE d.aggregation_rule = 'DERIVED';"
```

Expected: `IND-WAT-02` still shows `103.0000`, with `derivation_state = 'SUPERSEDED_MANUAL'`.

- [ ] **Step 3: Compute one indicator end to end**

In the app: open `#/denominators`, enter `REVENUE = 48` for the current fiscal year. Open the indicators screen and confirm `IND-BR-05` (Energy Intensity per Revenue) now shows a computed number with its arithmetic, provided `IND-ENG-01` has a value for that year.

Then change the revenue to `96` and confirm the indicator halves, drops to `DRAFT`, and shows the new arithmetic.

- [ ] **Step 4: Confirm a manual write is refused**

```bash
curl -X PATCH localhost:8080/api/v1/indicators/IND-BR-05/values/2025 \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"value": 999}'
```

Expected: HTTP 409 with the sentence about entering the figures on the denominators screen.

- [ ] **Step 5: Run the whole suite**

Run: `cd backend && mvn -q test`
Expected: all tests pass.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(indicators): <whatever the live run caught>"
```
