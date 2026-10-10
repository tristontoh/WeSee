# Denominator Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the platform the per-fiscal-year figures its ratio indicators divide by — revenue, headcount, hours worked, sites, suppliers, the board roster and the share register — so the derived-indicators plan has something to compute from.

**Architecture:** One narrow key/value table for scalar figures (typed by a Java enum), plus list tables for the board roster and share register. All tenant-owned via `TenantOwnedEntity`, so the existing `companyFilter` covers isolation with no new mechanism. Three migrations, three service/controller pairs under one new `com.wesee.esg.denominator` package, one frontend screen.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Flyway (`ddl-auto: validate` — the migration owns the schema, the entity must match it exactly), JPA/Hibernate, Lombok, JUnit 5, React 19 + Vite 6 + TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-10-denominator-layer-design.md`

## Global Constraints

- Every new `.java` and `.ts`/`.tsx` file starts with the project copyright header:
  ```
  /*
   * Copyright (c) 2026 Triston Toh. All rights reserved.
   * See LICENSE at the repository root — visibility is not a licence to use.
   */
  ```
- `ddl-auto: validate` is on. An entity field that does not match its column exactly fails application startup, not a test. Column names, nullability and `precision`/`scale` must mirror the migration.
- Migration versions V84, V85, V86 — in that order, no gaps, never edited after commit (Flyway checksums).
- All money/quantity columns are `NUMERIC(18,4)`, mapped as `BigDecimal` with `precision = 18, scale = 4`.
- Reuse the existing permission keys `indicators.view` and `indicators.edit`. These figures are indicator inputs; inventing `denominators.*` would mean a permission migration and a role backfill for no gain in expressiveness.
- Tenant scoping: every entity extends `TenantOwnedEntity`; every service method starts from `currentUserProvider.requireCompanyId()`. Never pass a company id in from the request body.
- Exceptions come from `com.wesee.esg.common.exceptions`: `NotFoundException`, `ConflictException`, `ForbiddenException`.
- Tests are plain JUnit 5 unit tests with no Spring context, matching `UnitConverterTest` — no `@SpringBootTest` anywhere in this plan.
- Build: `cd backend && mvn -q compile`. Tests: `cd backend && mvn -q test -Dtest=ClassName`.

## Review Focus

Five things the spec implies but no obvious task tests. Each has its test assigned to the task that owns the code.

1. **A figure entered for a fiscal year that does not exist on the company.** A typo'd year (FY2099, FY202) silently creates a row nothing will ever read. Expect a rejection with a stated range. → Task 2.
2. **A negative figure.** Headcount of −5, revenue of −1,000,000. A ratio built on it produces a negative percentage that looks like data. Expect a rejection. → Task 2.
3. **`EMPLOYEE_DEPARTURES` greater than `AVERAGE_HEADCOUNT`.** Arithmetically possible across a year of churn, so it must be *allowed*, not rejected — but a turnover rate above 100% needs to be explainable rather than refused. The figure layer stores it; the derivation layer decides. Test that the store accepts it. → Task 2.
4. **A board member whose `resigned_at` precedes `appointed_at`.** Tenure arithmetic goes negative and attendance denominators break. Expect a rejection. → Task 5.
5. **`public_held_shares` exceeding `total_outstanding_shares`.** A free float above 100% is impossible and would be published to a regulator. Expect a rejection. → Task 7.

---

### Task 1: The migration and enum for scalar figures

**Files:**
- Create: `backend/src/main/resources/db/migration/V84__company_annual_figure.sql`
- Create: `backend/src/main/java/com/wesee/esg/denominator/AnnualFigureKey.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/CompanyAnnualFigure.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/CompanyAnnualFigureRepository.java`
- Test: `backend/src/test/java/com/wesee/esg/denominator/AnnualFigureKeyTest.java`

**Interfaces:**
- Consumes: `com.wesee.esg.common.TenantOwnedEntity`, `com.wesee.esg.common.BaseEntity`
- Produces: `AnnualFigureKey` (enum with `canonicalUnit()` and `label()`), `CompanyAnnualFigure` entity, `CompanyAnnualFigureRepository.findByCompanyIdAndFiscalYear(UUID, Integer)` returning `List<CompanyAnnualFigure>` and `findByCompanyIdAndFiscalYearAndFigureKey(UUID, Integer, AnnualFigureKey)` returning `Optional<CompanyAnnualFigure>`

- [ ] **Step 1: Write the failing test**

`backend/src/test/java/com/wesee/esg/denominator/AnnualFigureKeyTest.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class AnnualFigureKeyTest {

    @Test
    void everyKeyDeclaresACanonicalUnit() {
        for (AnnualFigureKey key : AnnualFigureKey.values()) {
            assertNotNull(key.canonicalUnit(), key + " has no canonical unit");
            assertFalse(key.canonicalUnit().isBlank(), key + " has a blank canonical unit");
        }
    }

    @Test
    void everyKeyDeclaresALabel() {
        for (AnnualFigureKey key : AnnualFigureKey.values()) {
            assertNotNull(key.label(), key + " has no label");
            assertFalse(key.label().isBlank(), key + " has a blank label");
        }
    }

    @Test
    void theCatalogueIsTheEighteenFiguresTheSpecNames() {
        assertEquals(18, AnnualFigureKey.values().length);
    }

    @Test
    void revenueIsDenominatedInRinggitMillions() {
        assertEquals("RM mil", AnnualFigureKey.REVENUE.canonicalUnit());
    }

    @Test
    void lostTimeInjuriesAreCountedAsCases() {
        assertEquals("Cases", AnnualFigureKey.LOST_TIME_INJURIES.canonicalUnit());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=AnnualFigureKeyTest`
Expected: FAIL — compilation error, `AnnualFigureKey` does not exist.

- [ ] **Step 3: Write the migration**

`backend/src/main/resources/db/migration/V84__company_annual_figure.sql`:

```sql
-- Per-fiscal-year denominators. Fifteen of the catalogue's sixteen ESG formulas are ratios and
-- the platform held none of what they divide by; this is that data. Narrow key/value rather than
-- a column per figure, so a new denominator is an enum constant instead of a migration.
-- Deliberately absent: total energy (IND-ENG-01 already holds it) and total waste (IND-WST-01/02
-- already hold it). Where an indicator owns a number, the derivation reads the indicator.

CREATE TABLE company_annual_figure (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    figure_key VARCHAR(40) NOT NULL,
    value NUMERIC(18, 4) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    source_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, fiscal_year, figure_key)
);

CREATE INDEX idx_company_annual_figure_company_year
    ON company_annual_figure (company_id, fiscal_year);
```

- [ ] **Step 4: Write the enum**

`backend/src/main/java/com/wesee/esg/denominator/AnnualFigureKey.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

/**
 * The per-fiscal-year figures the platform's ratio indicators divide by. Each constant carries its
 * canonical unit, so a stored figure can be rendered and unit-checked without a second lookup.
 *
 * <p>Two figures that look like they belong here are deliberately absent: total energy, because
 * {@code IND-ENG-01} already records electricity in MWh, and total waste, because
 * {@code IND-WST-01} and {@code IND-WST-02} already carry generated and landfilled tonnage. A
 * second home for the same quantity is two numbers that can disagree.
 */
public enum AnnualFigureKey {

    REVENUE("RM mil", "Revenue", FigureGroup.FINANCIAL),
    PRODUCTION_OUTPUT("Units", "Production output", FigureGroup.FINANCIAL),
    RAW_MATERIAL_INPUT("Tonnes", "Raw material input", FigureGroup.FINANCIAL),
    RAW_MATERIAL_CONVERTED("Tonnes", "Raw material converted to finished goods", FigureGroup.FINANCIAL),

    AVERAGE_HEADCOUNT("People", "Average headcount", FigureGroup.WORKFORCE),
    EMPLOYEE_DEPARTURES("People", "Voluntary departures", FigureGroup.WORKFORCE),
    FEMALE_HEADCOUNT("People", "Female employees", FigureGroup.WORKFORCE),
    TOTAL_HOURS_WORKED("Hours", "Total hours worked", FigureGroup.WORKFORCE),
    LOST_TIME_INJURIES("Cases", "Lost time injuries", FigureGroup.WORKFORCE),
    TOTAL_TRAINING_HOURS("Hours", "Total training hours delivered", FigureGroup.WORKFORCE),
    EMPLOYEES_TRAINED_ANTICORRUPTION("People", "Employees trained on anti-corruption", FigureGroup.WORKFORCE),
    EMPLOYEES_AWARDED_EQUITY("People", "Employees awarded equity (ESOS)", FigureGroup.WORKFORCE),

    OPERATIONAL_SITES("Sites", "Operational sites", FigureGroup.SITES_AND_SUPPLIERS),
    SITES_CLIMATE_RISK_ASSESSED("Sites", "Sites assessed for physical climate risk", FigureGroup.SITES_AND_SUPPLIERS),
    SITES_NEAR_HIGH_CONSERVATION_VALUE("Sites", "Sites near high conservation value areas", FigureGroup.SITES_AND_SUPPLIERS),
    TIER1_SUPPLIERS("Suppliers", "Tier-1 suppliers", FigureGroup.SITES_AND_SUPPLIERS),
    TIER1_SUPPLIERS_ASSESSED("Suppliers", "Tier-1 suppliers assessed for ESG compliance", FigureGroup.SITES_AND_SUPPLIERS),

    RECYCLED_WATER_VOLUME("m3", "Recycled water volume", FigureGroup.WATER);

    private final String canonicalUnit;
    private final String label;
    private final FigureGroup group;

    AnnualFigureKey(String canonicalUnit, String label, FigureGroup group) {
        this.canonicalUnit = canonicalUnit;
        this.label = label;
        this.group = group;
    }

    public String canonicalUnit() {
        return canonicalUnit;
    }

    public String label() {
        return label;
    }

    public FigureGroup group() {
        return group;
    }

    /** How the data-entry screen divides these, matching how a reporting team divides the work. */
    public enum FigureGroup {
        FINANCIAL,
        WORKFORCE,
        SITES_AND_SUPPLIERS,
        WATER
    }
}
```

- [ ] **Step 5: Write the entity and repository**

`backend/src/main/java/com/wesee/esg/denominator/CompanyAnnualFigure.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "company_annual_figure")
@Getter
@Setter
@NoArgsConstructor
public class CompanyAnnualFigure extends TenantOwnedEntity {

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "figure_key", nullable = false, length = 40)
    private AnnualFigureKey figureKey;

    @Column(name = "value", nullable = false, precision = 18, scale = 4)
    private BigDecimal value;

    @Column(name = "unit", nullable = false, length = 30)
    private String unit;

    @Column(name = "source_note", columnDefinition = "TEXT")
    private String sourceNote;
}
```

`backend/src/main/java/com/wesee/esg/denominator/CompanyAnnualFigureRepository.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyAnnualFigureRepository extends JpaRepository<CompanyAnnualFigure, UUID> {

    List<CompanyAnnualFigure> findByCompanyIdAndFiscalYear(UUID companyId, Integer fiscalYear);

    Optional<CompanyAnnualFigure> findByCompanyIdAndFiscalYearAndFigureKey(
            UUID companyId, Integer fiscalYear, AnnualFigureKey figureKey);

    List<CompanyAnnualFigure> findByCompanyIdOrderByFiscalYearAsc(UUID companyId);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=AnnualFigureKeyTest`
Expected: PASS, 5 tests.

- [ ] **Step 7: Verify the schema matches the entity**

Run: `cd backend && mvn -q compile`
Expected: BUILD SUCCESS. (`ddl-auto: validate` runs at application startup, not compile — the real check is Task 9.)

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/db/migration/V84__company_annual_figure.sql \
        backend/src/main/java/com/wesee/esg/denominator/ \
        backend/src/test/java/com/wesee/esg/denominator/
git commit -m "feat(denominator): per-fiscal-year figure store

Fifteen of the sixteen ESG formulas are ratios and the platform held
none of their denominators. This is the table they divide by: narrow
key/value, typed by an enum that carries each figure's canonical unit."
```

---

### Task 2: Validation rules for a figure

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/denominator/FigureValidator.java`
- Test: `backend/src/test/java/com/wesee/esg/denominator/FigureValidatorTest.java`

**Interfaces:**
- Consumes: `AnnualFigureKey` from Task 1
- Produces: `FigureValidator.validate(AnnualFigureKey key, BigDecimal value, int fiscalYear)` — static, throws `IllegalArgumentException` with a human-readable message, returns void. `FigureValidator.EARLIEST_FISCAL_YEAR` (int, 2000) and `FigureValidator.latestFiscalYear()` (int, current year + 1).

This task carries Review Focus items 1, 2 and 3.

- [ ] **Step 1: Write the failing test**

`backend/src/test/java/com/wesee/esg/denominator/FigureValidatorTest.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Year;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FigureValidatorTest {

    @Test
    void anOrdinaryFigureIsAccepted() {
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.REVENUE, new BigDecimal("48.0000"), 2025));
    }

    @Test
    void aNegativeFigureIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                FigureValidator.validate(AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("-5"), 2025));
        assertTrue(e.getMessage().contains("negative"), e.getMessage());
    }

    @Test
    void zeroIsAcceptedBecauseACompanyMayGenuinelyHaveNoneOfSomething() {
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.LOST_TIME_INJURIES, BigDecimal.ZERO, 2025));
    }

    @Test
    void aFiscalYearBeforeTheFloorIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                FigureValidator.validate(AnnualFigureKey.REVENUE, new BigDecimal("48"), 1999));
        assertTrue(e.getMessage().contains("2000"), e.getMessage());
    }

    @Test
    void aFiscalYearBeyondNextYearIsRefused() {
        int tooFar = Year.now().getValue() + 2;
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                FigureValidator.validate(AnnualFigureKey.REVENUE, new BigDecimal("48"), tooFar));
        assertTrue(e.getMessage().contains(String.valueOf(FigureValidator.latestFiscalYear())), e.getMessage());
    }

    @Test
    void nextYearIsAcceptedBecauseAFiscalYearCanLeadTheCalendarYear() {
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.REVENUE, new BigDecimal("48"), Year.now().getValue() + 1));
    }

    @Test
    void aCountFigureWithFractionalPeopleIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                FigureValidator.validate(AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("12.5"), 2025));
        assertTrue(e.getMessage().contains("whole"), e.getMessage());
    }

    @Test
    void aMeasuredFigureWithDecimalsIsAccepted() {
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.RECYCLED_WATER_VOLUME, new BigDecimal("1240.5500"), 2025));
    }

    /**
     * Review Focus 3. Across a year of churn a company can genuinely lose more people than its
     * average headcount, producing a turnover rate above 100%. The figure store must accept it;
     * deciding whether that ratio is reportable belongs to the derivation layer, which can show
     * the inputs. Refusing it here would make a real company unable to report its real year.
     */
    @Test
    void departuresExceedingHeadcountAreStoredBecauseChurnCanGenuinelyExceedAverageHeadcount() {
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.EMPLOYEE_DEPARTURES, new BigDecimal("60"), 2025));
        assertDoesNotThrow(() ->
                FigureValidator.validate(AnnualFigureKey.AVERAGE_HEADCOUNT, new BigDecimal("50"), 2025));
    }

    @Test
    void theFloorYearIsTwoThousand() {
        assertEquals(2000, FigureValidator.EARLIEST_FISCAL_YEAR);
    }

    @Test
    void aNullValueIsRefused() {
        assertThrows(IllegalArgumentException.class, () ->
                FigureValidator.validate(AnnualFigureKey.REVENUE, null, 2025));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=FigureValidatorTest`
Expected: FAIL — `FigureValidator` does not exist.

- [ ] **Step 3: Write the validator**

`backend/src/main/java/com/wesee/esg/denominator/FigureValidator.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import java.math.BigDecimal;
import java.time.Year;
import java.util.EnumSet;
import java.util.Set;

/**
 * What a denominator figure is allowed to be. These rules exist because a wrong denominator does
 * not announce itself — it produces a plausible ratio that flows through sign-off into a signed
 * disclosure. The catalogue already contains a recycled-water figure of 103%, which is what a
 * ratio looks like when nothing checks its inputs.
 */
public final class FigureValidator {

    public static final int EARLIEST_FISCAL_YEAR = 2000;

    /** Figures counted in indivisible things. Half a person is a typo, not a measurement. */
    private static final Set<AnnualFigureKey> WHOLE_NUMBER_FIGURES = EnumSet.of(
            AnnualFigureKey.AVERAGE_HEADCOUNT,
            AnnualFigureKey.EMPLOYEE_DEPARTURES,
            AnnualFigureKey.FEMALE_HEADCOUNT,
            AnnualFigureKey.LOST_TIME_INJURIES,
            AnnualFigureKey.EMPLOYEES_TRAINED_ANTICORRUPTION,
            AnnualFigureKey.EMPLOYEES_AWARDED_EQUITY,
            AnnualFigureKey.OPERATIONAL_SITES,
            AnnualFigureKey.SITES_CLIMATE_RISK_ASSESSED,
            AnnualFigureKey.SITES_NEAR_HIGH_CONSERVATION_VALUE,
            AnnualFigureKey.TIER1_SUPPLIERS,
            AnnualFigureKey.TIER1_SUPPLIERS_ASSESSED);

    private FigureValidator() {
    }

    /** A fiscal year may lead the calendar year by one, so FY2027 is enterable during 2026. */
    public static int latestFiscalYear() {
        return Year.now().getValue() + 1;
    }

    public static void validate(AnnualFigureKey key, BigDecimal value, int fiscalYear) {
        if (key == null) {
            throw new IllegalArgumentException("A figure must name which figure it is");
        }
        if (value == null) {
            throw new IllegalArgumentException(key.label() + " has no value");
        }
        if (value.signum() < 0) {
            throw new IllegalArgumentException(
                    key.label() + " cannot be negative — a ratio built on it would report a negative percentage");
        }
        if (WHOLE_NUMBER_FIGURES.contains(key) && value.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException(
                    key.label() + " is counted in whole " + key.canonicalUnit().toLowerCase() + ", not fractions");
        }
        if (fiscalYear < EARLIEST_FISCAL_YEAR) {
            throw new IllegalArgumentException(
                    "Fiscal year " + fiscalYear + " is before " + EARLIEST_FISCAL_YEAR
                            + " — figures that old have nothing to report against");
        }
        if (fiscalYear > latestFiscalYear()) {
            throw new IllegalArgumentException(
                    "Fiscal year " + fiscalYear + " is beyond " + latestFiscalYear() + " — check the year");
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=FigureValidatorTest`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/denominator/FigureValidator.java \
        backend/src/test/java/com/wesee/esg/denominator/FigureValidatorTest.java
git commit -m "feat(denominator): reject the figures that would produce a wrong ratio

Negative values, fractional headcounts and typo'd fiscal years. Churn
above headcount is deliberately allowed — a real company can lose more
people in a year than its average headcount, and refusing it here would
make that year unreportable."
```

---

### Task 3: The figure service and controller

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/denominator/DenominatorService.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/DenominatorController.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/AnnualFigureDto.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/SetAnnualFigureRequest.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/FigureCatalogueEntryDto.java`

**Interfaces:**
- Consumes: `CompanyAnnualFigureRepository`, `FigureValidator`, `AnnualFigureKey` from Tasks 1–2; `com.wesee.esg.security.CurrentUserProvider` (existing — call `requireCompanyId()`)
- Produces: `DenominatorService.listFigures(int fiscalYear)` returning `List<AnnualFigureDto>`; `DenominatorService.setFigure(AnnualFigureKey, int, SetAnnualFigureRequest)` returning `AnnualFigureDto`; `DenominatorService.deleteFigure(AnnualFigureKey, int)` returning void; `DenominatorService.catalogue()` returning `List<FigureCatalogueEntryDto>`

- [ ] **Step 1: Write the DTOs**

`backend/src/main/java/com/wesee/esg/denominator/dto/AnnualFigureDto.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator.dto;

import com.wesee.esg.denominator.AnnualFigureKey;
import com.wesee.esg.denominator.CompanyAnnualFigure;

import java.math.BigDecimal;

public record AnnualFigureDto(
        AnnualFigureKey figureKey,
        String label,
        Integer fiscalYear,
        BigDecimal value,
        String unit,
        String sourceNote
) {
    public static AnnualFigureDto from(CompanyAnnualFigure f) {
        return new AnnualFigureDto(
                f.getFigureKey(),
                f.getFigureKey().label(),
                f.getFiscalYear(),
                f.getValue(),
                f.getUnit(),
                f.getSourceNote());
    }
}
```

`backend/src/main/java/com/wesee/esg/denominator/dto/SetAnnualFigureRequest.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SetAnnualFigureRequest(
        @NotNull BigDecimal value,
        @Size(max = 2000) String sourceNote
) {
}
```

`backend/src/main/java/com/wesee/esg/denominator/dto/FigureCatalogueEntryDto.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator.dto;

import com.wesee.esg.denominator.AnnualFigureKey;

/**
 * One entry on the data-entry screen: what to ask for, in what unit, under which heading. The
 * frontend renders its form from this rather than hard-coding a list that drifts from the enum.
 */
public record FigureCatalogueEntryDto(
        AnnualFigureKey figureKey,
        String label,
        String unit,
        String group,
        boolean wholeNumber
) {
    public static FigureCatalogueEntryDto from(AnnualFigureKey key, boolean wholeNumber) {
        return new FigureCatalogueEntryDto(
                key, key.label(), key.canonicalUnit(), key.group().name(), wholeNumber);
    }
}
```

- [ ] **Step 2: Expose whether a figure is a whole number**

Add to `FigureValidator` (the `WHOLE_NUMBER_FIGURES` set is already there, this only publishes it):

```java
    public static boolean isWholeNumber(AnnualFigureKey key) {
        return WHOLE_NUMBER_FIGURES.contains(key);
    }
```

- [ ] **Step 3: Write the service**

`backend/src/main/java/com/wesee/esg/denominator/DenominatorService.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.denominator.dto.AnnualFigureDto;
import com.wesee.esg.denominator.dto.FigureCatalogueEntryDto;
import com.wesee.esg.denominator.dto.SetAnnualFigureRequest;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class DenominatorService {

    private final CompanyAnnualFigureRepository figureRepository;
    private final CurrentUserProvider currentUserProvider;

    public DenominatorService(CompanyAnnualFigureRepository figureRepository,
                              CurrentUserProvider currentUserProvider) {
        this.figureRepository = figureRepository;
        this.currentUserProvider = currentUserProvider;
    }

    /** The form's shape, straight off the enum, so the screen cannot drift from the catalogue. */
    public List<FigureCatalogueEntryDto> catalogue() {
        return Arrays.stream(AnnualFigureKey.values())
                .map(k -> FigureCatalogueEntryDto.from(k, FigureValidator.isWholeNumber(k)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AnnualFigureDto> listFigures(int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        return figureRepository.findByCompanyIdAndFiscalYear(companyId, fiscalYear).stream()
                .sorted(Comparator.comparing(f -> f.getFigureKey().ordinal()))
                .map(AnnualFigureDto::from)
                .toList();
    }

    @Transactional
    public AnnualFigureDto setFigure(AnnualFigureKey figureKey, int fiscalYear, SetAnnualFigureRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        FigureValidator.validate(figureKey, request.value(), fiscalYear);

        CompanyAnnualFigure figure = figureRepository
                .findByCompanyIdAndFiscalYearAndFigureKey(companyId, fiscalYear, figureKey)
                .orElseGet(() -> {
                    CompanyAnnualFigure f = new CompanyAnnualFigure();
                    f.setCompanyId(companyId);
                    f.setFiscalYear(fiscalYear);
                    f.setFigureKey(figureKey);
                    return f;
                });
        figure.setValue(request.value());
        figure.setUnit(figureKey.canonicalUnit());
        figure.setSourceNote(request.sourceNote());
        return AnnualFigureDto.from(figureRepository.save(figure));
    }

    @Transactional
    public void deleteFigure(AnnualFigureKey figureKey, int fiscalYear) {
        UUID companyId = currentUserProvider.requireCompanyId();
        CompanyAnnualFigure figure = figureRepository
                .findByCompanyIdAndFiscalYearAndFigureKey(companyId, fiscalYear, figureKey)
                .orElseThrow(() -> new NotFoundException(
                        figureKey.label() + " has no value recorded for FY" + fiscalYear));
        figureRepository.delete(figure);
    }
}
```

- [ ] **Step 4: Write the controller**

`backend/src/main/java/com/wesee/esg/denominator/DenominatorController.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.denominator.dto.AnnualFigureDto;
import com.wesee.esg.denominator.dto.FigureCatalogueEntryDto;
import com.wesee.esg.denominator.dto.SetAnnualFigureRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The denominators the ratio indicators divide by. These are indicator inputs, so they sit behind
 * the indicator permissions rather than a set of their own.
 */
@RestController
@RequestMapping("/api/v1/denominators")
@Validated
public class DenominatorController {

    private final DenominatorService denominatorService;

    public DenominatorController(DenominatorService denominatorService) {
        this.denominatorService = denominatorService;
    }

    @GetMapping("/catalogue")
    @PreAuthorize("@perm.check('indicators.view')")
    public List<FigureCatalogueEntryDto> catalogue() {
        return denominatorService.catalogue();
    }

    @GetMapping("/figures/{fiscalYear}")
    @PreAuthorize("@perm.check('indicators.view')")
    public List<AnnualFigureDto> listFigures(@PathVariable int fiscalYear) {
        return denominatorService.listFigures(fiscalYear);
    }

    @PutMapping("/figures/{fiscalYear}/{figureKey}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public AnnualFigureDto setFigure(@PathVariable int fiscalYear,
                                     @PathVariable AnnualFigureKey figureKey,
                                     @Valid @RequestBody SetAnnualFigureRequest request) {
        return denominatorService.setFigure(figureKey, fiscalYear, request);
    }

    @DeleteMapping("/figures/{fiscalYear}/{figureKey}")
    @PreAuthorize("@perm.check('indicators.edit')")
    public void deleteFigure(@PathVariable int fiscalYear, @PathVariable AnnualFigureKey figureKey) {
        denominatorService.deleteFigure(figureKey, fiscalYear);
    }
}
```

- [ ] **Step 5: Confirm `IllegalArgumentException` becomes a 400**

Read `backend/src/main/java/com/wesee/esg/common/GlobalExceptionHandler.java`. If it has no `@ExceptionHandler(IllegalArgumentException.class)`, add one returning HTTP 400 with the exception message as the `ApiError` detail, matching how the existing handlers build their response. `FigureValidator` throws this type and the message is written for a user to read; a 500 would waste it.

- [ ] **Step 6: Compile**

Run: `cd backend && mvn -q compile`
Expected: BUILD SUCCESS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/denominator/ backend/src/main/java/com/wesee/esg/common/GlobalExceptionHandler.java
git commit -m "feat(denominator): figure API

PUT is idempotent per (year, key) — entering a figure twice corrects it
rather than duplicating it. The catalogue endpoint renders the form from
the enum so the screen cannot drift from what the formulas read."
```

---

### Task 4: The board roster migration and entities

**Files:**
- Create: `backend/src/main/resources/db/migration/V85__board_roster.sql`
- Create: `backend/src/main/java/com/wesee/esg/denominator/BoardMember.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/BoardMeeting.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/BoardMeetingAttendance.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/BoardMemberRepository.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/BoardMeetingRepository.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/BoardMeetingAttendanceRepository.java`

**Interfaces:**
- Consumes: `TenantOwnedEntity`
- Produces: `BoardMemberRepository.findByCompanyIdAndFiscalYearOrderByNameAsc(UUID, Integer)`; `BoardMeetingRepository.findByCompanyIdAndFiscalYearOrderByHeldOnAsc(UUID, Integer)`; `BoardMeetingAttendanceRepository.findByCompanyIdAndMeetingIdIn(UUID, List<UUID>)`

- [ ] **Step 1: Write the migration**

`backend/src/main/resources/db/migration/V85__board_roster.sql`:

```sql
-- Director independence, gender and meeting attendance are properties of people, not scalars.
-- Flattening them into counts would lose exactly the detail the governance formulas need, and
-- would make "meetings held during this director's tenure" unanswerable.

CREATE TABLE board_member (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    role_title VARCHAR(150),
    independent BOOLEAN NOT NULL DEFAULT FALSE,
    -- Nullable on purpose. Not every jurisdiction requires it to be recorded, and a nullable
    -- column says "not stated" where a NOT NULL default would invent an answer.
    gender VARCHAR(20),
    appointed_at DATE,
    resigned_at DATE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT board_member_tenure_ordered CHECK (
        appointed_at IS NULL OR resigned_at IS NULL OR resigned_at >= appointed_at
    )
);

CREATE INDEX idx_board_member_company_year ON board_member (company_id, fiscal_year);

CREATE TABLE board_meeting (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    held_on DATE NOT NULL,
    kind VARCHAR(40) NOT NULL DEFAULT 'BOARD',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_board_meeting_company_year ON board_meeting (company_id, fiscal_year);

CREATE TABLE board_meeting_attendance (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    meeting_id UUID NOT NULL REFERENCES board_meeting (id) ON DELETE CASCADE,
    board_member_id UUID NOT NULL REFERENCES board_member (id) ON DELETE CASCADE,
    attended BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (meeting_id, board_member_id)
);

CREATE INDEX idx_board_attendance_company ON board_meeting_attendance (company_id);
```

- [ ] **Step 2: Write the entities**

`BoardMember.java` — extends `TenantOwnedEntity`, fields: `Integer fiscalYear` (`fiscal_year`), `String name` (length 200), `String roleTitle` (`role_title`, 150), `Boolean independent` (default `false`), `String gender` (20, nullable), `LocalDate appointedAt` (`appointed_at`), `LocalDate resignedAt` (`resigned_at`). Copyright header, `@Entity`, `@Table(name = "board_member")`, `@Getter @Setter @NoArgsConstructor`.

`BoardMeeting.java` — extends `TenantOwnedEntity`, fields: `Integer fiscalYear`, `LocalDate heldOn` (`held_on`, nullable = false), `String kind` (40, nullable = false, default the Java field to `"BOARD"`).

`BoardMeetingAttendance.java` — extends `TenantOwnedEntity`, fields: `UUID meetingId` (`meeting_id`, nullable = false), `UUID boardMemberId` (`board_member_id`, nullable = false), `Boolean attended` (nullable = false). Plain UUID columns rather than `@ManyToOne`, because nothing needs to navigate from an attendance row to its meeting object and a lazy proxy here buys nothing.

- [ ] **Step 3: Write the repositories**

```java
public interface BoardMemberRepository extends JpaRepository<BoardMember, UUID> {
    List<BoardMember> findByCompanyIdAndFiscalYearOrderByNameAsc(UUID companyId, Integer fiscalYear);
    Optional<BoardMember> findByIdAndCompanyId(UUID id, UUID companyId);
}

public interface BoardMeetingRepository extends JpaRepository<BoardMeeting, UUID> {
    List<BoardMeeting> findByCompanyIdAndFiscalYearOrderByHeldOnAsc(UUID companyId, Integer fiscalYear);
    Optional<BoardMeeting> findByIdAndCompanyId(UUID id, UUID companyId);
}

public interface BoardMeetingAttendanceRepository extends JpaRepository<BoardMeetingAttendance, UUID> {
    List<BoardMeetingAttendance> findByCompanyIdAndMeetingIdIn(UUID companyId, List<UUID> meetingIds);
    Optional<BoardMeetingAttendance> findByCompanyIdAndMeetingIdAndBoardMemberId(
            UUID companyId, UUID meetingId, UUID boardMemberId);
}
```

Each file gets the copyright header and the imports it needs.

- [ ] **Step 4: Compile**

Run: `cd backend && mvn -q compile`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V85__board_roster.sql backend/src/main/java/com/wesee/esg/denominator/
git commit -m "feat(denominator): board roster, meetings and attendance

Tenure dates live on the member so attendance can be measured against
meetings held while a director actually sat, not meetings held in the
year. Gender is nullable because 'not stated' is an honest answer and a
NOT NULL default would invent one."
```

---

### Task 5: Board composition arithmetic

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/denominator/BoardComposition.java`
- Test: `backend/src/test/java/com/wesee/esg/denominator/BoardCompositionTest.java`

**Interfaces:**
- Consumes: `BoardMember` from Task 4
- Produces: `BoardComposition.directorCount(List<BoardMember>)` → `int`; `BoardComposition.femaleCount(List<BoardMember>)` → `int`; `BoardComposition.independentCount(List<BoardMember>)` → `int`; `BoardComposition.servedOn(BoardMember, LocalDate)` → `boolean`; `BoardComposition.validateTenure(LocalDate appointedAt, LocalDate resignedAt)` → void, throws `IllegalArgumentException`

This task carries Review Focus item 4.

- [ ] **Step 1: Write the failing test**

`backend/src/test/java/com/wesee/esg/denominator/BoardCompositionTest.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BoardCompositionTest {

    private static BoardMember member(String name, String gender, boolean independent,
                                      LocalDate appointed, LocalDate resigned) {
        BoardMember m = new BoardMember();
        m.setName(name);
        m.setGender(gender);
        m.setIndependent(independent);
        m.setAppointedAt(appointed);
        m.setResignedAt(resigned);
        return m;
    }

    @Test
    void countsEveryDirectorOnTheRoster() {
        List<BoardMember> roster = List.of(
                member("A", "FEMALE", true, null, null),
                member("B", "MALE", false, null, null),
                member("C", "MALE", true, null, null));
        assertEquals(3, BoardComposition.directorCount(roster));
    }

    @Test
    void countsFemaleDirectorsCaseInsensitively() {
        List<BoardMember> roster = List.of(
                member("A", "Female", true, null, null),
                member("B", "FEMALE", false, null, null),
                member("C", "male", true, null, null));
        assertEquals(2, BoardComposition.femaleCount(roster));
    }

    @Test
    void aDirectorWithNoGenderRecordedIsNotCountedAsFemale() {
        List<BoardMember> roster = List.of(
                member("A", null, true, null, null),
                member("B", "FEMALE", false, null, null));
        assertEquals(1, BoardComposition.femaleCount(roster));
    }

    @Test
    void countsIndependentDirectors() {
        List<BoardMember> roster = List.of(
                member("A", "FEMALE", true, null, null),
                member("B", "MALE", false, null, null));
        assertEquals(1, BoardComposition.independentCount(roster));
    }

    @Test
    void anEmptyRosterCountsZeroRatherThanThrowing() {
        assertEquals(0, BoardComposition.directorCount(List.of()));
        assertEquals(0, BoardComposition.femaleCount(List.of()));
    }

    @Test
    void aDirectorWithNoDatesServedOnAnyDate() {
        BoardMember m = member("A", "FEMALE", true, null, null);
        assertTrue(BoardComposition.servedOn(m, LocalDate.of(2025, 6, 1)));
    }

    @Test
    void aDirectorAppointedMidYearDidNotServeBeforeAppointment() {
        BoardMember m = member("A", "FEMALE", true, LocalDate.of(2025, 7, 1), null);
        assertFalse(BoardComposition.servedOn(m, LocalDate.of(2025, 6, 1)));
        assertTrue(BoardComposition.servedOn(m, LocalDate.of(2025, 7, 1)));
        assertTrue(BoardComposition.servedOn(m, LocalDate.of(2025, 8, 1)));
    }

    @Test
    void aResignedDirectorDidNotServeAfterResignation() {
        BoardMember m = member("A", "FEMALE", true, null, LocalDate.of(2025, 9, 30));
        assertTrue(BoardComposition.servedOn(m, LocalDate.of(2025, 9, 30)));
        assertFalse(BoardComposition.servedOn(m, LocalDate.of(2025, 10, 1)));
    }

    /** Review Focus 4. Negative tenure makes every attendance denominator meaningless. */
    @Test
    void resignationBeforeAppointmentIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                BoardComposition.validateTenure(LocalDate.of(2025, 7, 1), LocalDate.of(2025, 3, 1)));
        assertTrue(e.getMessage().toLowerCase().contains("resign"), e.getMessage());
    }

    @Test
    void resignationOnTheDayOfAppointmentIsAllowed() {
        assertDoesNotThrow(() ->
                BoardComposition.validateTenure(LocalDate.of(2025, 7, 1), LocalDate.of(2025, 7, 1)));
    }

    @Test
    void openEndedTenureIsAllowed() {
        assertDoesNotThrow(() -> BoardComposition.validateTenure(null, null));
        assertDoesNotThrow(() -> BoardComposition.validateTenure(LocalDate.of(2025, 1, 1), null));
        assertDoesNotThrow(() -> BoardComposition.validateTenure(null, LocalDate.of(2025, 1, 1)));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=BoardCompositionTest`
Expected: FAIL — `BoardComposition` does not exist.

- [ ] **Step 3: Write the implementation**

`backend/src/main/java/com/wesee/esg/denominator/BoardComposition.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import java.time.LocalDate;
import java.util.List;

/**
 * Counting a board. Pure functions over a roster, so the governance ratios can be unit-tested
 * without a database — and so "how many directors" has exactly one answer in the codebase.
 */
public final class BoardComposition {

    private static final String FEMALE = "FEMALE";

    private BoardComposition() {
    }

    public static int directorCount(List<BoardMember> roster) {
        return roster == null ? 0 : roster.size();
    }

    public static int femaleCount(List<BoardMember> roster) {
        if (roster == null) {
            return 0;
        }
        return (int) roster.stream()
                .filter(m -> m.getGender() != null && FEMALE.equalsIgnoreCase(m.getGender().trim()))
                .count();
    }

    public static int independentCount(List<BoardMember> roster) {
        if (roster == null) {
            return 0;
        }
        return (int) roster.stream().filter(m -> Boolean.TRUE.equals(m.getIndependent())).count();
    }

    /**
     * Whether this director sat on the given date. A null date is open-ended, not absent: a
     * roster entered without dates describes a director who served the whole year.
     */
    public static boolean servedOn(BoardMember member, LocalDate date) {
        if (member.getAppointedAt() != null && date.isBefore(member.getAppointedAt())) {
            return false;
        }
        return member.getResignedAt() == null || !date.isAfter(member.getResignedAt());
    }

    public static void validateTenure(LocalDate appointedAt, LocalDate resignedAt) {
        if (appointedAt != null && resignedAt != null && resignedAt.isBefore(appointedAt)) {
            throw new IllegalArgumentException(
                    "A director cannot resign on " + resignedAt + ", before being appointed on " + appointedAt);
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=BoardCompositionTest`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/denominator/BoardComposition.java \
        backend/src/test/java/com/wesee/esg/denominator/BoardCompositionTest.java
git commit -m "feat(denominator): board counting, as pure functions

One answer in the codebase to 'how many directors', testable without a
database. A director with no dates served the whole year; one who
resigned before being appointed is refused."
```

---

### Task 6: Board service and controller

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/denominator/BoardService.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/BoardController.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/BoardMemberDto.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/UpsertBoardMemberRequest.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/BoardMeetingDto.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/UpsertBoardMeetingRequest.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/SetAttendanceRequest.java`

**Interfaces:**
- Consumes: the three board repositories and `BoardComposition` from Tasks 4–5
- Produces: `BoardService.listMembers(int)`, `.upsertMember(UUID orNull, int, UpsertBoardMemberRequest)`, `.deleteMember(UUID, int)`, `.listMeetings(int)`, `.upsertMeeting(UUID orNull, int, UpsertBoardMeetingRequest)`, `.deleteMeeting(UUID)`, `.setAttendance(UUID meetingId, UUID memberId, boolean attended)`

- [ ] **Step 1: Write the DTOs**

`BoardMemberDto` — record of `UUID id, Integer fiscalYear, String name, String roleTitle, Boolean independent, String gender, LocalDate appointedAt, LocalDate resignedAt`, with a static `from(BoardMember)`.

`UpsertBoardMemberRequest` — record of `@NotBlank @Size(max = 200) String name, @Size(max = 150) String roleTitle, boolean independent, @Size(max = 20) String gender, LocalDate appointedAt, LocalDate resignedAt`.

`BoardMeetingDto` — record of `UUID id, Integer fiscalYear, LocalDate heldOn, String kind, List<AttendanceDto> attendance` where `AttendanceDto` is a nested record of `UUID boardMemberId, String memberName, boolean attended`.

`UpsertBoardMeetingRequest` — record of `@NotNull LocalDate heldOn, @Size(max = 40) String kind`.

`SetAttendanceRequest` — record of `@NotNull Boolean attended`.

All with the copyright header.

- [ ] **Step 2: Write the service**

`BoardService` follows `DenominatorService` exactly: constructor injection of the three repositories plus `CurrentUserProvider`; every method opens with `UUID companyId = currentUserProvider.requireCompanyId()`; every lookup uses a `...AndCompanyId` finder so a cross-tenant id returns `NotFoundException` rather than another company's row.

`upsertMember` calls `BoardComposition.validateTenure(request.appointedAt(), request.resignedAt())` before saving, and `FigureValidator.validate`'s year rules by calling a new small helper — reuse the year bounds by extracting them:

```java
    private void requireSaneFiscalYear(int fiscalYear) {
        if (fiscalYear < FigureValidator.EARLIEST_FISCAL_YEAR || fiscalYear > FigureValidator.latestFiscalYear()) {
            throw new IllegalArgumentException(
                    "Fiscal year " + fiscalYear + " is outside " + FigureValidator.EARLIEST_FISCAL_YEAR
                            + "–" + FigureValidator.latestFiscalYear());
        }
    }
```

`setAttendance` upserts on `(meetingId, boardMemberId)` and refuses with `ConflictException` when the member did not serve on the meeting's date, using `BoardComposition.servedOn` — recording that a director attended a meeting held before their appointment is a data error worth naming.

`listMeetings` loads the meetings, then one `findByCompanyIdAndMeetingIdIn` for all their attendance rows, then joins in memory. Not one query per meeting.

- [ ] **Step 3: Write the controller**

`BoardController` at `/api/v1/denominators/board`, `@PreAuthorize("@perm.check('indicators.view')")` on reads and `('indicators.edit')` on writes, mapping:

- `GET /members/{fiscalYear}` → `listMembers`
- `POST /members/{fiscalYear}` → `upsertMember(null, …)`
- `PUT /members/{fiscalYear}/{memberId}` → `upsertMember(memberId, …)`
- `DELETE /members/{fiscalYear}/{memberId}` → `deleteMember`
- `GET /meetings/{fiscalYear}` → `listMeetings`
- `POST /meetings/{fiscalYear}` → `upsertMeeting(null, …)`
- `PUT /meetings/{fiscalYear}/{meetingId}` → `upsertMeeting(meetingId, …)`
- `DELETE /meetings/{meetingId}` → `deleteMeeting`
- `PUT /meetings/{meetingId}/attendance/{memberId}` → `setAttendance`

- [ ] **Step 4: Compile**

Run: `cd backend && mvn -q compile`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/denominator/
git commit -m "feat(denominator): board roster API

Attendance at a meeting held outside a director's tenure is refused by
name rather than stored — it is a data error, and silently keeping it
would skew every attendance denominator built on the roster."
```

---

### Task 7: Share register

**Files:**
- Create: `backend/src/main/resources/db/migration/V86__share_register.sql`
- Create: `backend/src/main/java/com/wesee/esg/denominator/ShareCapital.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/Shareholding.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/ShareCapitalRepository.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/ShareholdingRepository.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/ShareRegisterService.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/ShareRegisterController.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/ShareCapitalDto.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/UpsertShareCapitalRequest.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/ShareholdingDto.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/dto/UpsertShareholdingRequest.java`
- Test: `backend/src/test/java/com/wesee/esg/denominator/ShareCapitalValidatorTest.java`
- Create: `backend/src/main/java/com/wesee/esg/denominator/ShareCapitalValidator.java`

**Interfaces:**
- Consumes: `TenantOwnedEntity`, `CurrentUserProvider`
- Produces: `ShareCapitalValidator.validate(BigDecimal total, BigDecimal publicHeld, BigDecimal bumiputeraHeld)` → void, throws `IllegalArgumentException`; `ShareRegisterService.getCapital(int)`, `.upsertCapital(int, UpsertShareCapitalRequest)`, `.listHoldings(int)`, `.upsertHolding(UUID orNull, int, UpsertShareholdingRequest)`, `.deleteHolding(UUID)`, `.topHoldings(int fiscalYear, int limit)`

This task carries Review Focus item 5.

- [ ] **Step 1: Write the failing test**

`backend/src/test/java/com/wesee/esg/denominator/ShareCapitalValidatorTest.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ShareCapitalValidatorTest {

    @Test
    void anOrdinaryCapitalStructureIsAccepted() {
        assertDoesNotThrow(() -> ShareCapitalValidator.validate(
                new BigDecimal("1000000"), new BigDecimal("250000"), new BigDecimal("300000")));
    }

    /** Review Focus 5. A free float above 100% is impossible and would reach a regulator. */
    @Test
    void publicHoldingAboveTheTotalIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                ShareCapitalValidator.validate(
                        new BigDecimal("1000000"), new BigDecimal("1200000"), BigDecimal.ZERO));
        assertTrue(e.getMessage().toLowerCase().contains("public"), e.getMessage());
    }

    @Test
    void bumiputeraHoldingAboveTheTotalIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                ShareCapitalValidator.validate(
                        new BigDecimal("1000000"), BigDecimal.ZERO, new BigDecimal("1200000")));
        assertTrue(e.getMessage().toLowerCase().contains("bumiputera"), e.getMessage());
    }

    /**
     * Public and bumiputera holdings overlap — a bumiputera public shareholder is both — so their
     * sum exceeding the total is not by itself an error. Only each one individually is bounded.
     */
    @Test
    void publicAndBumiputeraMayOverlapAndSumAboveTheTotal() {
        assertDoesNotThrow(() -> ShareCapitalValidator.validate(
                new BigDecimal("1000000"), new BigDecimal("700000"), new BigDecimal("600000")));
    }

    @Test
    void aNegativeHoldingIsRefused() {
        assertThrows(IllegalArgumentException.class, () -> ShareCapitalValidator.validate(
                new BigDecimal("1000000"), new BigDecimal("-1"), BigDecimal.ZERO));
    }

    @Test
    void zeroTotalSharesIsRefused() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                ShareCapitalValidator.validate(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
        assertTrue(e.getMessage().toLowerCase().contains("outstanding"), e.getMessage());
    }

    @Test
    void holdingExactlyTheWholeCompanyIsAccepted() {
        assertDoesNotThrow(() -> ShareCapitalValidator.validate(
                new BigDecimal("1000000"), new BigDecimal("1000000"), new BigDecimal("1000000")));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=ShareCapitalValidatorTest`
Expected: FAIL — `ShareCapitalValidator` does not exist.

- [ ] **Step 3: Write the migration**

`backend/src/main/resources/db/migration/V86__share_register.sql`:

```sql
-- Capital structure per fiscal year, and the holders behind it. Holders are rows rather than a
-- stored "top 5 total", because that total goes stale the moment the sixth holder overtakes the
-- fifth — "top 5" is a query, not a figure.

CREATE TABLE share_capital (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    total_outstanding_shares NUMERIC(18, 4) NOT NULL,
    public_held_shares NUMERIC(18, 4),
    bumiputera_held_shares NUMERIC(18, 4),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, fiscal_year),
    CONSTRAINT share_capital_total_positive CHECK (total_outstanding_shares > 0),
    CONSTRAINT share_capital_public_within_total CHECK (
        public_held_shares IS NULL
        OR (public_held_shares >= 0 AND public_held_shares <= total_outstanding_shares)
    ),
    CONSTRAINT share_capital_bumiputera_within_total CHECK (
        bumiputera_held_shares IS NULL
        OR (bumiputera_held_shares >= 0 AND bumiputera_held_shares <= total_outstanding_shares)
    )
);

CREATE TABLE shareholding (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    holder_name VARCHAR(250) NOT NULL,
    shares_held NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT shareholding_shares_non_negative CHECK (shares_held >= 0)
);

CREATE INDEX idx_shareholding_company_year ON shareholding (company_id, fiscal_year, shares_held DESC);
```

Note: `rank` from the spec is deliberately not a column. Rank is `ORDER BY shares_held DESC` — storing it would be a second source of truth that drifts on every edit.

- [ ] **Step 4: Write the validator**

`backend/src/main/java/com/wesee/esg/denominator/ShareCapitalValidator.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import java.math.BigDecimal;

/**
 * The capital structure's internal arithmetic. Mirrors the CHECK constraints in V86 so a bad
 * figure is refused with a sentence rather than a constraint-violation stack trace.
 */
public final class ShareCapitalValidator {

    private ShareCapitalValidator() {
    }

    public static void validate(BigDecimal totalOutstanding, BigDecimal publicHeld, BigDecimal bumiputeraHeld) {
        if (totalOutstanding == null || totalOutstanding.signum() <= 0) {
            throw new IllegalArgumentException("Total outstanding shares must be greater than zero");
        }
        requireWithin("Public-held shares", publicHeld, totalOutstanding);
        requireWithin("Bumiputera-held shares", bumiputeraHeld, totalOutstanding);
    }

    private static void requireWithin(String label, BigDecimal held, BigDecimal total) {
        if (held == null) {
            return;
        }
        if (held.signum() < 0) {
            throw new IllegalArgumentException(label + " cannot be negative");
        }
        if (held.compareTo(total) > 0) {
            throw new IllegalArgumentException(
                    label + " (" + held.toPlainString() + ") exceed the "
                            + total.toPlainString() + " shares outstanding");
        }
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=ShareCapitalValidatorTest`
Expected: PASS, 7 tests.

- [ ] **Step 6: Write the entities, repositories, DTOs, service and controller**

`ShareCapital` extends `TenantOwnedEntity`: `Integer fiscalYear`, `BigDecimal totalOutstandingShares`, `BigDecimal publicHeldShares`, `BigDecimal bumiputeraHeldShares`, all `precision = 18, scale = 4`.

`Shareholding` extends `TenantOwnedEntity`: `Integer fiscalYear`, `String holderName` (250), `BigDecimal sharesHeld`.

```java
public interface ShareCapitalRepository extends JpaRepository<ShareCapital, UUID> {
    Optional<ShareCapital> findByCompanyIdAndFiscalYear(UUID companyId, Integer fiscalYear);
}

public interface ShareholdingRepository extends JpaRepository<Shareholding, UUID> {
    List<Shareholding> findByCompanyIdAndFiscalYearOrderBySharesHeldDesc(UUID companyId, Integer fiscalYear);
    Optional<Shareholding> findByIdAndCompanyId(UUID id, UUID companyId);
}
```

`ShareRegisterService.topHoldings(int fiscalYear, int limit)` reads the ordered list and takes `limit` from the front — returning every row when fewer than `limit` exist, which is the behaviour Task 7's Review Focus line and the spec's testing section both name.

`ShareRegisterController` at `/api/v1/denominators/shares`, same permission pattern as Tasks 3 and 6:

- `GET /capital/{fiscalYear}` → `getCapital` (returns `null` body with 200 when none recorded, so the form renders empty rather than erroring)
- `PUT /capital/{fiscalYear}` → `upsertCapital`
- `GET /holdings/{fiscalYear}` → `listHoldings`
- `GET /holdings/{fiscalYear}/top/{limit}` → `topHoldings`
- `POST /holdings/{fiscalYear}` → `upsertHolding(null, …)`
- `PUT /holdings/{fiscalYear}/{holdingId}` → `upsertHolding(holdingId, …)`
- `DELETE /holdings/{holdingId}` → `deleteHolding`

- [ ] **Step 7: Compile and run the whole suite**

Run: `cd backend && mvn -q compile && mvn -q test`
Expected: BUILD SUCCESS, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/db/migration/V86__share_register.sql backend/src/main/java/com/wesee/esg/denominator/ backend/src/test/java/com/wesee/esg/denominator/
git commit -m "feat(denominator): share register

Rank is a query, not a column: storing it would drift the moment the
sixth holder overtakes the fifth. Public and bumiputera holdings each
bounded by the total but allowed to overlap, because a bumiputera public
shareholder is both."
```

---

### Task 8: The data-entry screen

**Files:**
- Create: `frontend/src/api/denominatorApi.ts`
- Create: `frontend/src/components/DenominatorsView.tsx`
- Modify: `frontend/src/App.tsx` (add the route)
- Modify: the navigation component that lists the app's sections (find it with `grep -rn "IndicatorsView" frontend/src --include=*.tsx`)

**Interfaces:**
- Consumes: the three controllers from Tasks 3, 6, 7
- Produces: a route at `#/denominators`

- [ ] **Step 1: Read the patterns before writing anything**

Read `frontend/src/api/indicatorApi.ts` (or whichever api client is nearest in shape) and `frontend/src/components/IndicatorsView.tsx`. Match their fetch wrapper, error handling, loading states and styling. Do not introduce a new data-fetching approach.

- [ ] **Step 2: Write the api client**

`frontend/src/api/denominatorApi.ts` — typed wrappers over every endpoint from Tasks 3, 6 and 7, with TypeScript types mirroring the DTOs:

```ts
export type AnnualFigureKey = string;

export interface FigureCatalogueEntry {
  figureKey: AnnualFigureKey;
  label: string;
  unit: string;
  group: 'FINANCIAL' | 'WORKFORCE' | 'SITES_AND_SUPPLIERS' | 'WATER';
  wholeNumber: boolean;
}

export interface AnnualFigure {
  figureKey: AnnualFigureKey;
  label: string;
  fiscalYear: number;
  value: string;
  unit: string;
  sourceNote: string | null;
}
```

Plus `BoardMember`, `BoardMeeting`, `ShareCapital`, `Shareholding` interfaces matching their DTOs, and one function per endpoint.

- [ ] **Step 3: Write the view**

`frontend/src/components/DenominatorsView.tsx`:

- A fiscal-year selector at the top, defaulting to the current year.
- Four sections rendered from `catalogue()`, grouped by `group`, in the enum's own order. Each row: label, a number input, the unit as a suffix, and an optional source-note field.
- A board section: the roster as an editable table (name, role, independent checkbox, gender select with a blank "not stated" option, appointed/resigned dates), and a meetings list with an attendance grid.
- A share register section: the capital figures, and the holders as an editable list shown in descending order of shares held.
- Saving a figure calls `PUT` and shows the server's message verbatim on a 400 — `FigureValidator`'s messages are written to be read by the person who typed the wrong number.

- [ ] **Step 4: Add the route and the nav entry**

Follow exactly how `IndicatorsView` is routed and listed. The app uses `HashRouter`, so the path is `#/denominators`.

- [ ] **Step 5: Build the frontend**

Run: `cd frontend && npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/denominatorApi.ts frontend/src/components/DenominatorsView.tsx frontend/src/App.tsx
git commit -m "feat(denominator): the screen that fills the denominators in

The form renders from the server's catalogue rather than a hard-coded
list, so it cannot drift from the enum the formulas read."
```

---

### Task 9: Prove the schema and the app still start

**Files:** none changed unless this task finds a problem.

- [ ] **Step 1: Start Postgres**

Run: `make infra`
Expected: Postgres up on :5432 with database `wesee_esg`.

- [ ] **Step 2: Start the backend and watch Flyway and the validator**

Run: `cd backend && mvn -q spring-boot:run` in the background, then watch the log.

Expected: V84, V85 and V86 apply in order, and Hibernate's `ddl-auto: validate` passes. A mismatch between an entity field and its column fails startup here with a named column — this is the only place that check runs, which is why this task exists as its own gate.

If startup fails with a duplicate-class error, run `make tidy` first — iCloud leaves `Xxx 2.java` copies that the compiler picks up.

- [ ] **Step 3: Exercise one figure end to end**

With the app running, log in through the frontend, open `#/denominators`, enter a revenue for the current fiscal year, reload the page, and confirm the value comes back.

Then enter `-5` for average headcount and confirm the screen shows the validator's sentence rather than a generic failure.

- [ ] **Step 4: Run the full backend suite once more**

Run: `cd backend && mvn -q test`
Expected: all tests pass.

- [ ] **Step 5: Commit any fixes**

If Steps 2–3 found nothing, there is nothing to commit and the plan is complete.

```bash
git add -A
git commit -m "fix(denominator): <whatever startup validation caught>"
```
