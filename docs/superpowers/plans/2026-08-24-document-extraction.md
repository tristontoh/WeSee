# Document Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a company upload a utility bill or invoice and have the platform propose the emission-activity and indicator records it implies, for a human to confirm before anything enters the real tables.

**Architecture:** Uploads land in two staging tables (`extracted_document`, `extracted_record`). A Spring `@Async` worker calls a `DocumentExtractor` behind a one-method interface, validates everything it returns against a closed set of the tenant's real emission factors and indicator definitions, and writes proposed records. A review screen commits accepted records through the existing `EmissionActivityService` and indicator audit trail. The real cloud extractor is the **last** thing built — every task before it uses a stub, so the full pipeline is working and tested before any external dependency exists.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Spring Data JPA, Flyway, Postgres 16, JUnit 5, Angular 19 (standalone components, signals).

**Spec:** `docs/superpowers/specs/2026-08-24-document-extraction-design.md`

## Global Constraints

- Migration numbering continues from `V51`; this plan uses `V52` only.
- Every new entity extends `com.wesee.esg.common.TenantOwnedEntity` (gives `id`, `companyId`, `createdAt`, `updatedAt` and the `companyFilter` tenant isolation).
- All `company_id` foreign keys are `ON DELETE RESTRICT`, matching every existing table.
- Repository finders returning `List` must carry an explicit `OrderBy` — this codebase treats unordered scans as a bug (see the recent ordering sweep).
- Controllers live under `/api/v1/...` and are thin: they delegate to a service and do no logic.
- Service methods take the tenant from `currentUserProvider.requireCompanyId()`, never from a request parameter.
- Uploads reuse the existing limits: extensions `pdf, png, jpg, jpeg, xlsx, csv, docx`; max 10 MB (`spring.servlet.multipart.max-file-size` is already `10MB`).
- No test may make a network call. Integration tests use the stub extractor.
- `BigDecimal` for all quantities and values; never `double`.

---

### Task 1: Schema and entities

**Files:**
- Create: `backend/src/main/resources/db/migration/V52__document_extraction.sql`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractedDocument.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractedRecord.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractionStatus.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractionTargetType.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/RecordStatus.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractedDocumentRepository.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractedRecordRepository.java`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `ExtractedDocument`, `ExtractedRecord` entities; `ExtractionStatus.{PENDING,EXTRACTING,READY,FAILED}`; `ExtractionTargetType.{EMISSION_ACTIVITY,INDICATOR_VALUE}`; `RecordStatus.{PROPOSED,ACCEPTED,REJECTED}`; `ExtractedDocumentRepository.findByCompanyIdOrderByCreatedAtDescIdDesc(UUID)`, `.findByIdAndCompanyId(UUID, UUID)`; `ExtractedRecordRepository.findByDocumentIdOrderByCreatedAtAscIdAsc(UUID)`, `.findByIdAndCompanyId(UUID, UUID)`, `.deleteByDocumentId(UUID)`.

- [ ] **Step 1: Write the migration**

Create `backend/src/main/resources/db/migration/V52__document_extraction.sql`:

```sql
-- Document extraction staging. Uploaded source documents (utility bills, invoices) are read by a
-- model, and the records they imply are proposed here rather than written straight into the real
-- tables. Nothing reaches indicator_value or emission_activity_entry without a human accepting it:
-- the assurance module computes a tamper-evident hash over indicator values, so machine output must
-- not be able to enter that set unreviewed.

CREATE TABLE extracted_document (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    original_file_name VARCHAR(255) NOT NULL,
    stored_path VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'EXTRACTING', 'READY', 'FAILED')),
    failure_reason TEXT,
    uploaded_by VARCHAR(200) NOT NULL,
    model_used VARCHAR(100),
    extracted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_extracted_document_company ON extracted_document (company_id, created_at DESC);

-- Typed columns rather than a JSON payload: half of these apply per target_type, but this lets
-- Postgres enforce the foreign keys, so extraction can never propose an emission factor or
-- indicator that does not exist.
CREATE TABLE extracted_record (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    document_id UUID NOT NULL REFERENCES extracted_document (id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('EMISSION_ACTIVITY', 'INDICATOR_VALUE')),

    emission_factor_id VARCHAR(30) REFERENCES emission_factor (id) ON DELETE RESTRICT,
    quantity NUMERIC(18, 4),

    indicator_definition_id VARCHAR(30) REFERENCES indicator_definition (id) ON DELETE RESTRICT,
    month INTEGER CHECK (month BETWEEN 1 AND 12),

    fiscal_year INTEGER NOT NULL,
    value NUMERIC(18, 4) NOT NULL,
    unit_as_read VARCHAR(30),
    confidence NUMERIC(4, 3),
    source_snippet TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PROPOSED', 'ACCEPTED', 'REJECTED')),
    committed_entity_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT emission_target_has_factor CHECK (
        target_type <> 'EMISSION_ACTIVITY' OR (emission_factor_id IS NOT NULL AND quantity IS NOT NULL)),
    CONSTRAINT indicator_target_has_definition CHECK (
        target_type <> 'INDICATOR_VALUE' OR indicator_definition_id IS NOT NULL)
);

CREATE INDEX idx_extracted_record_document ON extracted_record (document_id, created_at);
```

- [ ] **Step 2: Write the enums**

`ExtractionStatus.java`:

```java
package com.wesee.esg.extraction;

public enum ExtractionStatus {
    PENDING,
    EXTRACTING,
    READY,
    FAILED
}
```

`ExtractionTargetType.java`:

```java
package com.wesee.esg.extraction;

public enum ExtractionTargetType {
    EMISSION_ACTIVITY,
    INDICATOR_VALUE
}
```

`RecordStatus.java`:

```java
package com.wesee.esg.extraction;

public enum RecordStatus {
    PROPOSED,
    ACCEPTED,
    REJECTED
}
```

- [ ] **Step 3: Write the entities**

`ExtractedDocument.java`:

```java
package com.wesee.esg.extraction;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * An uploaded source document awaiting, undergoing, or finished with extraction. The file itself
 * stays on local disk; this row carries its status and provenance.
 */
@Entity
@Table(name = "extracted_document")
@Getter
@Setter
@NoArgsConstructor
public class ExtractedDocument extends TenantOwnedEntity {

    @Column(name = "original_file_name", nullable = false, length = 255)
    private String originalFileName;

    @Column(name = "stored_path", nullable = false, length = 500)
    private String storedPath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExtractionStatus status = ExtractionStatus.PENDING;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "uploaded_by", nullable = false, length = 200)
    private String uploadedBy;

    @Column(name = "model_used", length = 100)
    private String modelUsed;

    @Column(name = "extracted_at")
    private Instant extractedAt;
}
```

`ExtractedRecord.java`:

```java
package com.wesee.esg.extraction;

import com.wesee.esg.climate.EmissionFactor;
import com.wesee.esg.common.TenantOwnedEntity;
import com.wesee.esg.reference.IndicatorDefinition;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One record a document implies. A single electricity bill yields two of these: an
 * EMISSION_ACTIVITY row (kWh against a grid factor) and an INDICATOR_VALUE row (MWh against
 * IND-ENG-01). They are reviewed and accepted together.
 */
@Entity
@Table(name = "extracted_record")
@Getter
@Setter
@NoArgsConstructor
public class ExtractedRecord extends TenantOwnedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private ExtractedDocument document;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private ExtractionTargetType targetType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emission_factor_id")
    private EmissionFactor emissionFactor;

    @Column(precision = 18, scale = 4)
    private BigDecimal quantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "indicator_definition_id")
    private IndicatorDefinition indicatorDefinition;

    @Column
    private Integer month;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal value;

    @Column(name = "unit_as_read", length = 30)
    private String unitAsRead;

    @Column(precision = 4, scale = 3)
    private BigDecimal confidence;

    @Column(name = "source_snippet", columnDefinition = "TEXT")
    private String sourceSnippet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecordStatus status = RecordStatus.PROPOSED;

    @Column(name = "committed_entity_id")
    private UUID committedEntityId;
}
```

- [ ] **Step 4: Write the repositories**

`ExtractedDocumentRepository.java`:

```java
package com.wesee.esg.extraction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExtractedDocumentRepository extends JpaRepository<ExtractedDocument, UUID> {

    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is free,
     * so an unordered scan returns edited rows in a different position — and these rows change
     * status constantly as extraction runs. Newest first: the review queue is worked top-down.
     */
    List<ExtractedDocument> findByCompanyIdOrderByCreatedAtDescIdDesc(UUID companyId);

    Optional<ExtractedDocument> findByIdAndCompanyId(UUID id, UUID companyId);
}
```

`ExtractedRecordRepository.java`:

```java
package com.wesee.esg.extraction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExtractedRecordRepository extends JpaRepository<ExtractedRecord, UUID> {

    /** Ordered explicitly: accepting one record must not reshuffle the others under the reviewer. */
    List<ExtractedRecord> findByDocumentIdOrderByCreatedAtAscIdAsc(UUID documentId);

    Optional<ExtractedRecord> findByIdAndCompanyId(UUID id, UUID companyId);

    void deleteByDocumentId(UUID documentId);
}
```

- [ ] **Step 5: Verify the schema applies and the entities map**

Run:

```bash
cd backend && mvn -o clean compile && \
  mvn -o spring-boot:run -Dspring-boot.run.fork=false \
  -Dspring-boot.run.arguments=--server.port=8099
```

Expected: `Successfully applied 1 migration` (or `Migrating schema "public" to version 52`), then `Started EsgBackendApplication`. Startup is the only check that Spring Data can derive the finder names — `mvn compile` does not validate them. Stop the server with Ctrl-C once it starts.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V52__document_extraction.sql \
        backend/src/main/java/com/wesee/esg/extraction/
git commit -m "feat(extraction): staging schema for document extraction"
```

---

### Task 2: Unit conversion

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/extraction/UnitConverter.java`
- Test: `backend/src/test/java/com/wesee/esg/extraction/UnitConverterTest.java`

**Interfaces:**
- Consumes: nothing.
- Produces: `UnitConverter.convert(BigDecimal value, String fromUnit, String toUnit)` returning `BigDecimal`, throwing `IllegalArgumentException` on an unknown pair; `UnitConverter.canConvert(String fromUnit, String toUnit)` returning `boolean`.

This is a pure function with no Spring dependency, so it is tested directly like `IndicatorServiceComputeAnnualValueTest`.

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/java/com/wesee/esg/extraction/UnitConverterTest.java`:

```java
package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UnitConverterTest {

    @Test
    void kilowattHoursConvertToMegawattHours() {
        assertEquals(new BigDecimal("1.2400"), UnitConverter.convert(new BigDecimal("1240"), "kWh", "MWh"));
    }

    @Test
    void megawattHoursConvertBackToKilowattHours() {
        assertEquals(new BigDecimal("1240.0000"), UnitConverter.convert(new BigDecimal("1.24"), "MWh", "kWh"));
    }

    @Test
    void unitComparisonIgnoresCase() {
        assertEquals(new BigDecimal("1.2400"), UnitConverter.convert(new BigDecimal("1240"), "KWH", "mwh"));
    }

    @Test
    void identicalUnitsAreReturnedUnchangedToFourDecimals() {
        assertEquals(new BigDecimal("500.0000"), UnitConverter.convert(new BigDecimal("500"), "m3", "m3"));
    }

    @Test
    void litersConvertToCubicMetres() {
        assertEquals(new BigDecimal("1.5000"), UnitConverter.convert(new BigDecimal("1500"), "liters", "m3"));
    }

    @Test
    void unknownPairThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> UnitConverter.convert(new BigDecimal("1"), "kWh", "tonnes"));
    }

    @Test
    void canConvertReportsSupportedAndUnsupportedPairs() {
        assertTrue(UnitConverter.canConvert("kWh", "MWh"));
        assertFalse(UnitConverter.canConvert("kWh", "tonnes"));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && mvn -o test -Dtest=UnitConverterTest`
Expected: FAIL — compilation error, `UnitConverter` does not exist.

- [ ] **Step 3: Write the implementation**

Create `backend/src/main/java/com/wesee/esg/extraction/UnitConverter.java`:

```java
package com.wesee.esg.extraction;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Map;

/**
 * Converts a figure as printed on a document into the unit an indicator or emission factor is
 * denominated in — a bill reads kWh, IND-ENG-01 is in MWh. Deliberately a small closed table
 * rather than a general units library: the set of units this platform deals in is fixed and
 * short, and an unknown pair must fail loudly rather than guess.
 */
public final class UnitConverter {

    private static final int SCALE = 4;

    /** Multiplier taking `from` to `to`. Keyed "from|to", both lowercase. */
    private static final Map<String, BigDecimal> FACTORS = Map.of(
            "kwh|mwh", new BigDecimal("0.001"),
            "mwh|kwh", new BigDecimal("1000"),
            "liters|m3", new BigDecimal("0.001"),
            "m3|liters", new BigDecimal("1000"),
            "kg|tonnes", new BigDecimal("0.001"),
            "tonnes|kg", new BigDecimal("1000")
    );

    private UnitConverter() {
    }

    public static boolean canConvert(String fromUnit, String toUnit) {
        String from = normalise(fromUnit);
        String to = normalise(toUnit);
        return from.equals(to) || FACTORS.containsKey(from + "|" + to);
    }

    public static BigDecimal convert(BigDecimal value, String fromUnit, String toUnit) {
        String from = normalise(fromUnit);
        String to = normalise(toUnit);

        if (from.equals(to)) {
            return value.setScale(SCALE, RoundingMode.HALF_UP);
        }
        BigDecimal factor = FACTORS.get(from + "|" + to);
        if (factor == null) {
            throw new IllegalArgumentException("No conversion from " + fromUnit + " to " + toUnit);
        }
        return value.multiply(factor).setScale(SCALE, RoundingMode.HALF_UP);
    }

    private static String normalise(String unit) {
        return unit == null ? "" : unit.trim().toLowerCase(Locale.ROOT);
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && mvn -o test -Dtest=UnitConverterTest`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/extraction/UnitConverter.java \
        backend/src/test/java/com/wesee/esg/extraction/UnitConverterTest.java
git commit -m "feat(extraction): unit conversion between document and indicator units"
```

---

### Task 3: The extractor interface and its stub

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/extraction/DocumentExtractor.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractionContext.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractionResult.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ProposedRecord.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/StubDocumentExtractor.java`

**Interfaces:**
- Consumes: `ExtractionTargetType` (Task 1).
- Produces: `DocumentExtractor.extract(byte[], String, ExtractionContext)` returning `ExtractionResult`; records `ExtractionContext(List<FactorOption> factors, List<IndicatorOption> indicators, int defaultFiscalYear)`, `ExtractionContext.FactorOption(String id, String name, String activityUnit)`, `ExtractionContext.IndicatorOption(String id, String name, String unit)`, `ExtractionResult(String modelUsed, List<ProposedRecord> records)`, and `ProposedRecord(ExtractionTargetType targetType, String targetId, BigDecimal value, String unitAsRead, Integer fiscalYear, Integer month, BigDecimal confidence, String sourceSnippet)`.

`targetId` is a single loose string holding either an emission factor id or an indicator definition id, because at this boundary it is untrusted model output — Task 4 resolves it against the closed set and only then does it become a foreign key.

- [ ] **Step 1: Write the value types**

`ExtractionContext.java`:

```java
package com.wesee.esg.extraction;

import java.util.List;

/**
 * The closed set an extractor may choose from. Passing the tenant's real factors and indicators
 * in — rather than letting a model name whatever it likes — is what keeps proposals resolvable.
 */
public record ExtractionContext(
        List<FactorOption> factors,
        List<IndicatorOption> indicators,
        int defaultFiscalYear
) {
    public record FactorOption(String id, String name, String activityUnit) {
    }

    public record IndicatorOption(String id, String name, String unit) {
    }
}
```

`ProposedRecord.java`:

```java
package com.wesee.esg.extraction;

import java.math.BigDecimal;

/**
 * One record an extractor believes a document implies. `targetId` is untrusted at this point —
 * it is whatever the extractor named, and is resolved against the closed set before it becomes
 * a foreign key.
 */
public record ProposedRecord(
        ExtractionTargetType targetType,
        String targetId,
        BigDecimal value,
        String unitAsRead,
        Integer fiscalYear,
        Integer month,
        BigDecimal confidence,
        String sourceSnippet
) {
}
```

`ExtractionResult.java`:

```java
package com.wesee.esg.extraction;

import java.util.List;

public record ExtractionResult(String modelUsed, List<ProposedRecord> records) {
}
```

`DocumentExtractor.java`:

```java
package com.wesee.esg.extraction;

/**
 * The seam between this platform and whatever reads documents. One method, so an on-premise
 * implementation is a contained swap if a tenant ever requires one.
 */
public interface DocumentExtractor {

    /**
     * @param content     the raw uploaded bytes
     * @param contentType the browser-supplied MIME type, or null
     * @param context     the closed set of factors and indicators this tenant has
     * @throws ExtractionFailedException when the document cannot be read at all
     */
    ExtractionResult extract(byte[] content, String contentType, ExtractionContext context);
}
```

- [ ] **Step 2: Write the stub**

Create `StubDocumentExtractor.java`. This is the default implementation until a provider is chosen, and it is what every test runs against:

```java
package com.wesee.esg.extraction;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Stands in until an extraction provider is chosen, and backs every test so the suite never makes
 * a network call. Proposes a fixed electricity reading against whichever grid factor and
 * electricity indicator the tenant actually has, exercising the two-destination path end to end.
 */
@Component
@ConditionalOnMissingBean(name = "cloudDocumentExtractor")
public class StubDocumentExtractor implements DocumentExtractor {

    static final BigDecimal STUB_KWH = new BigDecimal("1240");

    @Override
    public ExtractionResult extract(byte[] content, String contentType, ExtractionContext context) {
        List<ProposedRecord> records = new ArrayList<>();

        context.factors().stream()
                .filter(f -> f.id().equals("GRID_ELECTRICITY_MY"))
                .findFirst()
                .ifPresent(f -> records.add(new ProposedRecord(
                        ExtractionTargetType.EMISSION_ACTIVITY, f.id(), STUB_KWH, "kWh",
                        context.defaultFiscalYear(), null, new BigDecimal("0.900"),
                        "Total consumption: 1,240 kWh")));

        context.indicators().stream()
                .filter(i -> i.id().equals("IND-ENG-01"))
                .findFirst()
                .ifPresent(i -> records.add(new ProposedRecord(
                        ExtractionTargetType.INDICATOR_VALUE, i.id(), STUB_KWH, "kWh",
                        context.defaultFiscalYear(), null, new BigDecimal("0.900"),
                        "Total consumption: 1,240 kWh")));

        return new ExtractionResult("stub", records);
    }
}
```

- [ ] **Step 3: Write the failure exception**

Create `backend/src/main/java/com/wesee/esg/extraction/ExtractionFailedException.java`:

```java
package com.wesee.esg.extraction;

/** The document could not be read at all — distinct from reading it and finding nothing. */
public class ExtractionFailedException extends RuntimeException {

    public ExtractionFailedException(String message, Throwable cause) {
        super(message, cause);
    }

    public ExtractionFailedException(String message) {
        super(message);
    }
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && mvn -o compile`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/extraction/
git commit -m "feat(extraction): extractor interface, value types, and stub implementation"
```

---

### Task 4: Closed-set validation

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/extraction/ProposalValidator.java`
- Test: `backend/src/test/java/com/wesee/esg/extraction/ProposalValidatorTest.java`

**Interfaces:**
- Consumes: `ProposedRecord`, `ExtractionContext`, `ExtractionTargetType` (Task 3); `UnitConverter` (Task 2).
- Produces: `ProposalValidator.validate(List<ProposedRecord>, ExtractionContext)` returning `List<ValidatedProposal>`; record `ValidatedProposal(ProposedRecord source, String resolvedTargetId, BigDecimal convertedValue)`.

This is the guard that stops model output becoming a foreign key. A proposal naming something outside the closed set is dropped, not repaired — and dropping one must not discard the rest of the document.

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/java/com/wesee/esg/extraction/ProposalValidatorTest.java`:

```java
package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProposalValidatorTest {

    private static final ExtractionContext CONTEXT = new ExtractionContext(
            List.of(new ExtractionContext.FactorOption("GRID_ELECTRICITY_MY", "Grid Electricity", "kWh")),
            List.of(new ExtractionContext.IndicatorOption("IND-ENG-01", "Total Electricity Consumed", "MWh")),
            2026);

    private static ProposedRecord proposal(ExtractionTargetType type, String targetId, String value, String unit) {
        return new ProposedRecord(type, targetId, new BigDecimal(value), unit, 2026, null,
                new BigDecimal("0.900"), "snippet");
    }

    @Test
    void keepsAProposalNamingAFactorThatExists() {
        var result = ProposalValidator.validate(
                List.of(proposal(ExtractionTargetType.EMISSION_ACTIVITY, "GRID_ELECTRICITY_MY", "1240", "kWh")),
                CONTEXT);

        assertEquals(1, result.size());
        assertEquals("GRID_ELECTRICITY_MY", result.get(0).resolvedTargetId());
        assertEquals(new BigDecimal("1240.0000"), result.get(0).convertedValue());
    }

    @Test
    void convertsIntoTheIndicatorsOwnUnit() {
        var result = ProposalValidator.validate(
                List.of(proposal(ExtractionTargetType.INDICATOR_VALUE, "IND-ENG-01", "1240", "kWh")),
                CONTEXT);

        assertEquals(1, result.size());
        assertEquals(new BigDecimal("1.2400"), result.get(0).convertedValue());
    }

    @Test
    void dropsAProposalNamingAFactorThatDoesNotExist() {
        var result = ProposalValidator.validate(
                List.of(proposal(ExtractionTargetType.EMISSION_ACTIVITY, "INVENTED_FACTOR", "1240", "kWh")),
                CONTEXT);

        assertTrue(result.isEmpty());
    }

    @Test
    void dropsOneBadProposalWithoutDiscardingTheGoodOnesBesideIt() {
        var result = ProposalValidator.validate(List.of(
                proposal(ExtractionTargetType.EMISSION_ACTIVITY, "INVENTED_FACTOR", "1", "kWh"),
                proposal(ExtractionTargetType.EMISSION_ACTIVITY, "GRID_ELECTRICITY_MY", "1240", "kWh")),
                CONTEXT);

        assertEquals(1, result.size());
        assertEquals("GRID_ELECTRICITY_MY", result.get(0).resolvedTargetId());
    }

    @Test
    void dropsAProposalWhoseUnitCannotReachTheTargetUnit() {
        var result = ProposalValidator.validate(
                List.of(proposal(ExtractionTargetType.INDICATOR_VALUE, "IND-ENG-01", "5", "tonnes")),
                CONTEXT);

        assertTrue(result.isEmpty());
    }

    @Test
    void dropsAProposalWithANullOrNegativeValue() {
        var negative = new ProposedRecord(ExtractionTargetType.EMISSION_ACTIVITY, "GRID_ELECTRICITY_MY",
                new BigDecimal("-5"), "kWh", 2026, null, new BigDecimal("0.9"), "snippet");

        assertTrue(ProposalValidator.validate(List.of(negative), CONTEXT).isEmpty());
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && mvn -o test -Dtest=ProposalValidatorTest`
Expected: FAIL — compilation error, `ProposalValidator` does not exist.

- [ ] **Step 3: Write the implementation**

Create `backend/src/main/java/com/wesee/esg/extraction/ProposalValidator.java`:

```java
package com.wesee.esg.extraction;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Turns untrusted extractor output into proposals that are safe to store. Anything naming a
 * target outside the closed set, carrying an unusable value, or stated in a unit that cannot
 * reach the target's unit is dropped — one bad proposal never discards the rest of a document.
 */
public final class ProposalValidator {

    private ProposalValidator() {
    }

    public record ValidatedProposal(ProposedRecord source, String resolvedTargetId, BigDecimal convertedValue) {
    }

    public static List<ValidatedProposal> validate(List<ProposedRecord> proposals, ExtractionContext context) {
        List<ValidatedProposal> kept = new ArrayList<>();
        for (ProposedRecord proposal : proposals) {
            validateOne(proposal, context).ifPresent(kept::add);
        }
        return kept;
    }

    private static java.util.Optional<ValidatedProposal> validateOne(ProposedRecord proposal, ExtractionContext context) {
        if (proposal.value() == null || proposal.value().signum() < 0 || proposal.targetId() == null) {
            return java.util.Optional.empty();
        }
        if (proposal.month() != null && (proposal.month() < 1 || proposal.month() > 12)) {
            return java.util.Optional.empty();
        }

        String targetUnit = targetUnitFor(proposal, context);
        if (targetUnit == null) {
            return java.util.Optional.empty();
        }
        if (!UnitConverter.canConvert(proposal.unitAsRead(), targetUnit)) {
            return java.util.Optional.empty();
        }

        BigDecimal converted = UnitConverter.convert(proposal.value(), proposal.unitAsRead(), targetUnit);
        return java.util.Optional.of(new ValidatedProposal(proposal, proposal.targetId(), converted));
    }

    /** Null when the proposal names a target this tenant does not have. */
    private static String targetUnitFor(ProposedRecord proposal, ExtractionContext context) {
        if (proposal.targetType() == ExtractionTargetType.EMISSION_ACTIVITY) {
            return context.factors().stream()
                    .filter(f -> f.id().equals(proposal.targetId()))
                    .map(ExtractionContext.FactorOption::activityUnit)
                    .findFirst()
                    .orElse(null);
        }
        return context.indicators().stream()
                .filter(i -> i.id().equals(proposal.targetId()))
                .map(ExtractionContext.IndicatorOption::unit)
                .findFirst()
                .orElse(null);
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && mvn -o test -Dtest=ProposalValidatorTest`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/extraction/ProposalValidator.java \
        backend/src/test/java/com/wesee/esg/extraction/ProposalValidatorTest.java
git commit -m "feat(extraction): validate extractor output against the tenant's closed set"
```

---

### Task 5: The sign-off guard

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/extraction/SignOffGuard.java`
- Test: `backend/src/test/java/com/wesee/esg/extraction/SignOffGuardTest.java`

**Interfaces:**
- Consumes: nothing beyond `java.util`.
- Produces: `SignOffGuard.isYearLocked(Integer fiscalYear, Set<Integer> signedYears)` returning `boolean`.

Kept as a pure predicate so it is testable without a database; the service supplies the signed-year set in Task 6. This is the rule that stops extraction invalidating the assurance module's tamper-evident hash.

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/java/com/wesee/esg/extraction/SignOffGuardTest.java`:

```java
package com.wesee.esg.extraction;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SignOffGuardTest {

    @Test
    void aYearWithASignOffIsLocked() {
        assertTrue(SignOffGuard.isYearLocked(2025, Set.of(2025)));
    }

    @Test
    void aYearWithoutASignOffIsOpen() {
        assertFalse(SignOffGuard.isYearLocked(2026, Set.of(2025)));
    }

    @Test
    void noSignOffsAtAllMeansEveryYearIsOpen() {
        assertFalse(SignOffGuard.isYearLocked(2026, Set.of()));
    }

    @Test
    void aNullYearIsTreatedAsOpenSoValidationElsewhereReportsIt() {
        assertFalse(SignOffGuard.isYearLocked(null, Set.of(2025)));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && mvn -o test -Dtest=SignOffGuardTest`
Expected: FAIL — compilation error, `SignOffGuard` does not exist.

- [ ] **Step 3: Write the implementation**

```java
package com.wesee.esg.extraction;

import java.util.Set;

/**
 * The assurance module computes a tamper-evident SHA-256 over a fiscal year's indicator values.
 * Committing an extracted record into a year that has already been signed off would silently
 * break that check, so it is refused.
 */
public final class SignOffGuard {

    private SignOffGuard() {
    }

    public static boolean isYearLocked(Integer fiscalYear, Set<Integer> signedYears) {
        return fiscalYear != null && signedYears.contains(fiscalYear);
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && mvn -o test -Dtest=SignOffGuardTest`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/extraction/SignOffGuard.java \
        backend/src/test/java/com/wesee/esg/extraction/SignOffGuardTest.java
git commit -m "feat(extraction): sign-off guard predicate"
```

---

### Task 6: Upload, storage, and the async extraction worker

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractionStorageService.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractionContextProvider.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractionWorker.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractionService.java`
- Modify: `backend/src/main/java/com/wesee/esg/EsgBackendApplication.java` (add `@EnableAsync`)

**Interfaces:**
- Consumes: all of Tasks 1–5; `EmissionFactorRepository.findAllByOrderByScopeAscNameAsc()`, `IndicatorDefinitionRepository.findByMatterIdInOrderByCategoryAscNameAsc(List<String>)`, `MatterSetResolverService.resolveApplicableMatters(Company)`, `AppUserRepository.findById(UUID)`, `CurrentUserProvider.requireCompanyId()` / `.getPrincipal()`.
- Produces: `ExtractionContextProvider.contextFor(UUID companyId)` returning `ExtractionContext`; `ExtractionService.upload(MultipartFile)` returning `UUID`; `ExtractionWorker.runExtraction(UUID documentId, UUID companyId)` (async, void); `ExtractionStorageService.store(UUID companyId, UUID documentId, MultipartFile)` returning the relative path `String`, `.read(String relativePath)` returning `byte[]`, `.resolve(String relativePath)` returning `Path`.

**Dependency direction matters here.** `ExtractionService` calls the worker, and the worker needs the
closed set. If the worker took `ExtractionService`, the two would depend on each other and Spring Boot
would refuse to start — circular references are rejected by default since 2.6. So the closed set lives
in its own bean, `ExtractionContextProvider`, which both use and which depends on neither:

```
ExtractionService ──→ ExtractionWorker ──→ ExtractionContextProvider
        │                                            ▲
        └────────────────────────────────────────────┘
```

**On the current user's display name.** `WeSeePrincipal` carries `userId, companyId, role, email,
scopes, jti` — there is **no** `name()`. To record who uploaded or entered something, look the user up
the way `IndicatorService` does:
`appUserRepository.findById(currentUserProvider.getPrincipal().userId()).map(AppUser::getName)`.

- [ ] **Step 1: Write the storage service**

Mirrors `IndicatorEvidenceService`'s guards deliberately — UUID-generated names and a resolved-path check against the uploads root:

```java
package com.wesee.esg.extraction;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Local-disk storage for uploaded source documents, under uploads/extraction/{companyId}/{documentId}/. */
@Service
public class ExtractionStorageService {

    static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "png", "jpg", "jpeg", "xlsx", "csv", "docx");
    static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024;

    private final Path uploadsRoot;

    public ExtractionStorageService(@Value("${wesee.uploads.dir}") String uploadsDir) {
        this.uploadsRoot = Paths.get(uploadsDir).toAbsolutePath().normalize();
    }

    public String store(UUID companyId, UUID documentId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds the 10MB limit");
        }
        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank()
                        ? file.getOriginalFilename() : "document");
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type: ." + extension);
        }

        try {
            Path dir = uploadsRoot.resolve(Paths.get("extraction", companyId.toString(), documentId.toString()));
            Files.createDirectories(dir);
            Path target = dir.resolve(UUID.randomUUID() + "-" + originalName).normalize();
            if (!target.startsWith(dir)) {
                throw new IllegalArgumentException("Invalid file name");
            }
            file.transferTo(target);
            return uploadsRoot.relativize(target).toString();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store document", e);
        }
    }

    public byte[] read(String relativePath) {
        try {
            return Files.readAllBytes(resolve(relativePath));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read stored document", e);
        }
    }

    public Path resolve(String relativePath) {
        Path path = uploadsRoot.resolve(relativePath).normalize();
        if (!path.startsWith(uploadsRoot)) {
            throw new IllegalArgumentException("Invalid stored path");
        }
        return path;
    }

    static String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }
}
```

- [ ] **Step 2: Write the closed-set provider**

Its own bean so nothing depends on `ExtractionService` in the other direction:

```java
package com.wesee.esg.extraction;

import com.wesee.esg.climate.EmissionFactorRepository;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.reference.IndicatorDefinitionRepository;
import com.wesee.esg.reference.MatterSetResolverService;
import com.wesee.esg.reference.SustainabilityMatter;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.List;
import java.util.UUID;

/** Builds the closed set of factors and indicators a tenant's proposals must resolve against. */
@Component
public class ExtractionContextProvider {

    private final EmissionFactorRepository factorRepository;
    private final IndicatorDefinitionRepository indicatorDefinitionRepository;
    private final MatterSetResolverService matterSetResolverService;
    private final CompanyRepository companyRepository;

    public ExtractionContextProvider(EmissionFactorRepository factorRepository,
                                      IndicatorDefinitionRepository indicatorDefinitionRepository,
                                      MatterSetResolverService matterSetResolverService,
                                      CompanyRepository companyRepository) {
        this.factorRepository = factorRepository;
        this.indicatorDefinitionRepository = indicatorDefinitionRepository;
        this.matterSetResolverService = matterSetResolverService;
        this.companyRepository = companyRepository;
    }

    @Transactional(readOnly = true)
    public ExtractionContext contextFor(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found"));

        List<ExtractionContext.FactorOption> factors = factorRepository.findAllByOrderByScopeAscNameAsc().stream()
                .map(f -> new ExtractionContext.FactorOption(f.getId(), f.getName(), f.getActivityUnit()))
                .toList();

        List<String> matterIds = matterSetResolverService.resolveApplicableMatters(company).stream()
                .map(SustainabilityMatter::getId)
                .toList();
        List<ExtractionContext.IndicatorOption> indicators =
                indicatorDefinitionRepository.findByMatterIdInOrderByCategoryAscNameAsc(matterIds).stream()
                        .map(d -> new ExtractionContext.IndicatorOption(d.getId(), d.getName(), d.getUnit()))
                        .toList();

        return new ExtractionContext(factors, indicators, Year.now().getValue());
    }
}
```

- [ ] **Step 3: Write the async worker**

Separate from `ExtractionService` because Spring's `@Async` proxy does not apply to self-invocation — calling an async method from another method of the same bean runs it synchronously:

```java
package com.wesee.esg.extraction;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Runs extraction off the request thread. Single-process only: if this instance dies mid-run the
 * document stays EXTRACTING and must be retried by hand. Acceptable at current scale; scaling out
 * would mean an outbox table and a poller instead.
 */
@Component
public class ExtractionWorker {

    private static final Logger log = LoggerFactory.getLogger(ExtractionWorker.class);

    private final ExtractedDocumentRepository documentRepository;
    private final ExtractedRecordRepository recordRepository;
    private final ExtractionStorageService storageService;
    private final DocumentExtractor extractor;
    private final ExtractionContextProvider contextProvider;
    private final com.wesee.esg.climate.EmissionFactorRepository factorRepository;
    private final com.wesee.esg.reference.IndicatorDefinitionRepository indicatorDefinitionRepository;

    public ExtractionWorker(ExtractedDocumentRepository documentRepository,
                            ExtractedRecordRepository recordRepository,
                            ExtractionStorageService storageService,
                            DocumentExtractor extractor,
                            ExtractionContextProvider contextProvider,
                            com.wesee.esg.climate.EmissionFactorRepository factorRepository,
                            com.wesee.esg.reference.IndicatorDefinitionRepository indicatorDefinitionRepository) {
        this.documentRepository = documentRepository;
        this.recordRepository = recordRepository;
        this.storageService = storageService;
        this.extractor = extractor;
        this.contextProvider = contextProvider;
        this.factorRepository = factorRepository;
        this.indicatorDefinitionRepository = indicatorDefinitionRepository;
    }

    @Async
    @Transactional
    public void runExtraction(UUID documentId, UUID companyId) {
        ExtractedDocument document = documentRepository.findByIdAndCompanyId(documentId, companyId).orElse(null);
        if (document == null) {
            return;
        }

        document.setStatus(ExtractionStatus.EXTRACTING);
        documentRepository.save(document);

        try {
            ExtractionContext context = contextProvider.contextFor(companyId);
            byte[] content = storageService.read(document.getStoredPath());
            ExtractionResult result = extractor.extract(content, null, context);

            List<ProposalValidator.ValidatedProposal> valid =
                    ProposalValidator.validate(result.records(), context);

            for (ProposalValidator.ValidatedProposal proposal : valid) {
                recordRepository.save(toEntity(proposal, document, companyId));
            }

            document.setModelUsed(result.modelUsed());
            document.setExtractedAt(Instant.now());
            document.setStatus(ExtractionStatus.READY);
        } catch (Exception e) {
            log.warn("Extraction failed for document {}", documentId, e);
            document.setStatus(ExtractionStatus.FAILED);
            document.setFailureReason(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        }
        documentRepository.save(document);
    }

    private ExtractedRecord toEntity(ProposalValidator.ValidatedProposal proposal,
                                      ExtractedDocument document, UUID companyId) {
        ProposedRecord source = proposal.source();
        ExtractedRecord entity = new ExtractedRecord();
        entity.setCompanyId(companyId);
        entity.setDocument(document);
        entity.setTargetType(source.targetType());
        entity.setFiscalYear(source.fiscalYear());
        entity.setMonth(source.month());
        entity.setValue(proposal.convertedValue());
        entity.setUnitAsRead(source.unitAsRead());
        entity.setConfidence(source.confidence());
        entity.setSourceSnippet(source.sourceSnippet());
        entity.setStatus(RecordStatus.PROPOSED);

        if (source.targetType() == ExtractionTargetType.EMISSION_ACTIVITY) {
            entity.setEmissionFactor(factorRepository.findById(proposal.resolvedTargetId()).orElseThrow());
            entity.setQuantity(proposal.convertedValue());
        } else {
            entity.setIndicatorDefinition(
                    indicatorDefinitionRepository.findById(proposal.resolvedTargetId()).orElseThrow());
        }
        return entity;
    }
}
```

- [ ] **Step 4: Write the service that owns upload**

Note `displayName()`: `WeSeePrincipal` has no name field, so the user is looked up — the same approach `IndicatorService` uses for `enteredBy`. It falls back to the principal's email so the column is never null.

```java
package com.wesee.esg.extraction;

import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.extraction.dto.ExtractedDocumentResponse;
import com.wesee.esg.extraction.dto.ExtractedRecordResponse;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
public class ExtractionService {

    private final ExtractedDocumentRepository documentRepository;
    private final ExtractedRecordRepository recordRepository;
    private final ExtractionStorageService storageService;
    private final ExtractionWorker worker;
    private final AppUserRepository appUserRepository;
    private final CurrentUserProvider currentUserProvider;

    public ExtractionService(ExtractedDocumentRepository documentRepository,
                             ExtractedRecordRepository recordRepository,
                             ExtractionStorageService storageService,
                             ExtractionWorker worker,
                             AppUserRepository appUserRepository,
                             CurrentUserProvider currentUserProvider) {
        this.documentRepository = documentRepository;
        this.recordRepository = recordRepository;
        this.storageService = storageService;
        this.worker = worker;
        this.appUserRepository = appUserRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public UUID upload(MultipartFile file) {
        UUID companyId = currentUserProvider.requireCompanyId();

        ExtractedDocument document = new ExtractedDocument();
        document.setCompanyId(companyId);
        document.setOriginalFileName(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "document");
        document.setUploadedBy(displayName());
        document.setStatus(ExtractionStatus.PENDING);
        document.setStoredPath("pending");
        document = documentRepository.save(document);

        document.setStoredPath(storageService.store(companyId, document.getId(), file));
        documentRepository.save(document);

        worker.runExtraction(document.getId(), companyId);
        return document.getId();
    }

    /** WeSeePrincipal carries no name, so the user is looked up — as IndicatorService does. */
    private String displayName() {
        return appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .map(AppUser::getName)
                .orElse(currentUserProvider.getPrincipal().email());
    }
}
```

- [ ] **Step 5: Enable async**

Add `@EnableAsync` to `EsgBackendApplication`:

```java
@SpringBootApplication
@EnableAsync
public class EsgBackendApplication {
```

with `import org.springframework.scheduling.annotation.EnableAsync;`.

- [ ] **Step 6: Verify it boots**

Run:

```bash
cd backend && mvn -o clean compile && \
  mvn -o spring-boot:run -Dspring-boot.run.fork=false \
  -Dspring-boot.run.arguments=--server.port=8099
```

Expected: `Started EsgBackendApplication`. Two failures to watch for: a `NoSuchBeanDefinitionException` for `DocumentExtractor` means the `@ConditionalOnMissingBean` on the stub is wrong — the stub must be the active bean while no cloud extractor exists; and `Relying upon circular references is disallowed` means a bean took a dependency the other way round, against the diagram above. Stop with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/extraction/ \
        backend/src/main/java/com/wesee/esg/EsgBackendApplication.java
git commit -m "feat(extraction): upload, local storage, and async extraction worker"
```

---

### Task 7: Review and commit endpoints

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractionReviewService.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/ExtractionController.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/dto/ExtractedDocumentResponse.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/dto/ExtractedRecordResponse.java`
- Create: `backend/src/main/java/com/wesee/esg/extraction/dto/AcceptRecordRequest.java`
- Modify: `backend/src/main/java/com/wesee/esg/extraction/ExtractionService.java` (add `list`, `get`, `retry`)

**Interfaces:**
- Consumes: Tasks 1–6; `EmissionActivityService.addEntry(int, String, BigDecimal)`; `IndicatorValueRepository.findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(UUID, String, Integer)`; `IndicatorAuditEntryRepository`; `SignOffRecordRepository.findByCompanyIdOrderByFiscalYearDesc(UUID)`.
- Produces: REST endpoints listed below; `ExtractionReviewService.accept(UUID recordId, AcceptRecordRequest)` returning `ExtractedRecordResponse`; `.reject(UUID recordId)` returning `ExtractedRecordResponse`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/extraction/documents` | upload (multipart `file`) |
| `GET` | `/api/v1/extraction/documents` | review queue |
| `GET` | `/api/v1/extraction/documents/{id}` | one document + its records |
| `POST` | `/api/v1/extraction/documents/{id}/retry` | re-run a FAILED document |
| `POST` | `/api/v1/extraction/records/{id}/accept` | commit, with optional corrections |
| `POST` | `/api/v1/extraction/records/{id}/reject` | discard one proposal |

- [ ] **Step 1: Write the DTOs**

`AcceptRecordRequest.java` — every field optional; a null means "use what was proposed":

```java
package com.wesee.esg.extraction.dto;

import java.math.BigDecimal;

public record AcceptRecordRequest(BigDecimal value, Integer fiscalYear, Integer month) {
}
```

`ExtractedRecordResponse.java`:

```java
package com.wesee.esg.extraction.dto;

import com.wesee.esg.extraction.ExtractedRecord;
import com.wesee.esg.extraction.ExtractionTargetType;
import com.wesee.esg.extraction.RecordStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record ExtractedRecordResponse(
        UUID id,
        ExtractionTargetType targetType,
        String targetId,
        String targetName,
        BigDecimal value,
        String unitAsRead,
        Integer fiscalYear,
        Integer month,
        BigDecimal confidence,
        String sourceSnippet,
        RecordStatus status
) {
    public static ExtractedRecordResponse from(ExtractedRecord record) {
        boolean emission = record.getTargetType() == ExtractionTargetType.EMISSION_ACTIVITY;
        return new ExtractedRecordResponse(
                record.getId(),
                record.getTargetType(),
                emission ? record.getEmissionFactor().getId() : record.getIndicatorDefinition().getId(),
                emission ? record.getEmissionFactor().getName() : record.getIndicatorDefinition().getName(),
                record.getValue(),
                record.getUnitAsRead(),
                record.getFiscalYear(),
                record.getMonth(),
                record.getConfidence(),
                record.getSourceSnippet(),
                record.getStatus());
    }
}
```

`ExtractedDocumentResponse.java`:

```java
package com.wesee.esg.extraction.dto;

import com.wesee.esg.extraction.ExtractedDocument;
import com.wesee.esg.extraction.ExtractionStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ExtractedDocumentResponse(
        UUID id,
        String originalFileName,
        ExtractionStatus status,
        String failureReason,
        String uploadedBy,
        Instant createdAt,
        List<ExtractedRecordResponse> records
) {
    public static ExtractedDocumentResponse from(ExtractedDocument document, List<ExtractedRecordResponse> records) {
        return new ExtractedDocumentResponse(
                document.getId(),
                document.getOriginalFileName(),
                document.getStatus(),
                document.getFailureReason(),
                document.getUploadedBy(),
                document.getCreatedAt(),
                records);
    }
}
```

- [ ] **Step 2: Write the review service**

```java
package com.wesee.esg.extraction;

import com.wesee.esg.climate.EmissionActivityService;
import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.extraction.dto.AcceptRecordRequest;
import com.wesee.esg.extraction.dto.ExtractedRecordResponse;
import com.wesee.esg.indicators.IndicatorAuditEntry;
import com.wesee.esg.indicators.IndicatorAuditEntryRepository;
import com.wesee.esg.indicators.IndicatorValue;
import com.wesee.esg.indicators.IndicatorValueRepository;
import com.wesee.esg.assurance.SignOffRecord;
import com.wesee.esg.assurance.SignOffRecordRepository;
import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Turns an accepted proposal into a real record, or discards it. */
@Service
public class ExtractionReviewService {

    private final ExtractedRecordRepository recordRepository;
    private final IndicatorValueRepository indicatorValueRepository;
    private final IndicatorAuditEntryRepository auditEntryRepository;
    private final SignOffRecordRepository signOffRepository;
    private final EmissionActivityService emissionActivityService;
    private final CurrentUserProvider currentUserProvider;

    public ExtractionReviewService(ExtractedRecordRepository recordRepository,
                                    IndicatorValueRepository indicatorValueRepository,
                                    IndicatorAuditEntryRepository auditEntryRepository,
                                    SignOffRecordRepository signOffRepository,
                                    EmissionActivityService emissionActivityService,
                                    CurrentUserProvider currentUserProvider) {
        this.recordRepository = recordRepository;
        this.indicatorValueRepository = indicatorValueRepository;
        this.auditEntryRepository = auditEntryRepository;
        this.signOffRepository = signOffRepository;
        this.emissionActivityService = emissionActivityService;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public ExtractedRecordResponse accept(UUID recordId, AcceptRecordRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        ExtractedRecord record = recordRepository.findByIdAndCompanyId(recordId, companyId)
                .orElseThrow(() -> new NotFoundException("Extracted record not found"));
        if (record.getStatus() != RecordStatus.PROPOSED) {
            throw new ConflictException("This record has already been reviewed");
        }

        BigDecimal value = request.value() != null ? request.value() : record.getValue();
        Integer fiscalYear = request.fiscalYear() != null ? request.fiscalYear() : record.getFiscalYear();
        Integer month = request.month() != null ? request.month() : record.getMonth();

        Set<Integer> signedYears = signOffRepository.findByCompanyIdOrderByFiscalYearDesc(companyId).stream()
                .map(SignOffRecord::getFiscalYear)
                .collect(Collectors.toSet());
        if (SignOffGuard.isYearLocked(fiscalYear, signedYears)) {
            throw new ConflictException("FY" + fiscalYear + " has already been signed off — "
                    + "accepting this would invalidate its assurance hash. Revoke the sign-off first.");
        }

        UUID committedId = record.getTargetType() == ExtractionTargetType.EMISSION_ACTIVITY
                ? commitEmissionActivity(record, fiscalYear, value)
                : commitIndicatorValue(record, companyId, fiscalYear, month, value);

        record.setStatus(RecordStatus.ACCEPTED);
        record.setCommittedEntityId(committedId);
        return ExtractedRecordResponse.from(recordRepository.save(record));
    }

    @Transactional
    public ExtractedRecordResponse reject(UUID recordId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        ExtractedRecord record = recordRepository.findByIdAndCompanyId(recordId, companyId)
                .orElseThrow(() -> new NotFoundException("Extracted record not found"));
        if (record.getStatus() != RecordStatus.PROPOSED) {
            throw new ConflictException("This record has already been reviewed");
        }
        record.setStatus(RecordStatus.REJECTED);
        return ExtractedRecordResponse.from(recordRepository.save(record));
    }

    /** Reuses EmissionActivityService so the tCO2e maths lives in exactly one place. */
    private UUID commitEmissionActivity(ExtractedRecord record, Integer fiscalYear, BigDecimal quantity) {
        return emissionActivityService
                .addEntry(fiscalYear, record.getEmissionFactor().getId(), quantity)
                .id();
    }

    private UUID commitIndicatorValue(ExtractedRecord record, UUID companyId,
                                       Integer fiscalYear, Integer month, BigDecimal value) {
        String definitionId = record.getIndicatorDefinition().getId();

        IndicatorValue indicatorValue = indicatorValueRepository
                .findByCompanyIdAndIndicatorDefinitionIdAndFiscalYear(companyId, definitionId, fiscalYear)
                .orElseGet(() -> {
                    IndicatorValue v = new IndicatorValue();
                    v.setCompanyId(companyId);
                    v.setIndicatorDefinition(record.getIndicatorDefinition());
                    v.setFiscalYear(fiscalYear);
                    return v;
                });
        indicatorValue.setValue(value);
        indicatorValue.setComputed(false);
        indicatorValueRepository.save(indicatorValue);

        // The audit entry is what makes an extracted value indistinguishable in structure from a
        // manual entry with evidence attached — same fields, same trail, provenance preserved.
        IndicatorAuditEntry audit = new IndicatorAuditEntry();
        audit.setCompanyId(companyId);
        audit.setIndicatorDefinition(record.getIndicatorDefinition());
        audit.setFiscalYear(fiscalYear);
        audit.setMonth(month);
        audit.setValue(value);
        audit.setEnteredBy(appUserRepository.findById(currentUserProvider.getPrincipal().userId())
                .map(com.wesee.esg.user.AppUser::getName)
                .orElse(currentUserProvider.getPrincipal().email()));
        audit.setSourceDocName(record.getDocument().getOriginalFileName());
        audit.setSourceDocPath(record.getDocument().getStoredPath());
        audit.setComment("Extracted from " + record.getDocument().getOriginalFileName());
        auditEntryRepository.save(audit);

        return indicatorValue.getId();
    }
}
```

`EmissionActivityEntryResponse`'s first component is `UUID id`, so `.id()` is correct as written.

`ExtractionReviewService` also needs `AppUserRepository appUserRepository` in its constructor and field list, for the `enteredBy` lookup above — `WeSeePrincipal` has no name.

- [ ] **Step 3: Add list/get/retry to `ExtractionService`**

Append these methods. The constructor already has everything they need — Task 6 injected `recordRepository` and `worker`, and `upload` already starts the worker, so nothing else changes:

```java
    @Transactional(readOnly = true)
    public List<ExtractedDocumentResponse> list() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return documentRepository.findByCompanyIdOrderByCreatedAtDescIdDesc(companyId).stream()
                .map(d -> ExtractedDocumentResponse.from(d, recordsFor(d.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ExtractedDocumentResponse get(UUID documentId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        ExtractedDocument document = documentRepository.findByIdAndCompanyId(documentId, companyId)
                .orElseThrow(() -> new NotFoundException("Document not found"));
        return ExtractedDocumentResponse.from(document, recordsFor(documentId));
    }

    @Transactional
    public void retry(UUID documentId) {
        UUID companyId = currentUserProvider.requireCompanyId();
        ExtractedDocument document = documentRepository.findByIdAndCompanyId(documentId, companyId)
                .orElseThrow(() -> new NotFoundException("Document not found"));
        if (document.getStatus() != ExtractionStatus.FAILED) {
            throw new ConflictException("Only a failed document can be retried");
        }
        recordRepository.deleteByDocumentId(documentId);
        document.setStatus(ExtractionStatus.PENDING);
        document.setFailureReason(null);
        documentRepository.save(document);
        worker.runExtraction(documentId, companyId);
    }

    private List<ExtractedRecordResponse> recordsFor(UUID documentId) {
        return recordRepository.findByDocumentIdOrderByCreatedAtAscIdAsc(documentId).stream()
                .map(ExtractedRecordResponse::from)
                .toList();
    }
```

- [ ] **Step 4: Write the controller**

```java
package com.wesee.esg.extraction;

import com.wesee.esg.extraction.dto.AcceptRecordRequest;
import com.wesee.esg.extraction.dto.ExtractedDocumentResponse;
import com.wesee.esg.extraction.dto.ExtractedRecordResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/extraction")
public class ExtractionController {

    private final ExtractionService extractionService;
    private final ExtractionReviewService reviewService;

    public ExtractionController(ExtractionService extractionService, ExtractionReviewService reviewService) {
        this.extractionService = extractionService;
        this.reviewService = reviewService;
    }

    @PostMapping("/documents")
    public ExtractedDocumentResponse upload(@RequestParam("file") MultipartFile file) {
        return extractionService.get(extractionService.upload(file));
    }

    @GetMapping("/documents")
    public List<ExtractedDocumentResponse> list() {
        return extractionService.list();
    }

    @GetMapping("/documents/{id}")
    public ExtractedDocumentResponse get(@PathVariable UUID id) {
        return extractionService.get(id);
    }

    @PostMapping("/documents/{id}/retry")
    public ExtractedDocumentResponse retry(@PathVariable UUID id) {
        extractionService.retry(id);
        return extractionService.get(id);
    }

    @PostMapping("/records/{id}/accept")
    public ExtractedRecordResponse accept(@PathVariable UUID id, @RequestBody(required = false) AcceptRecordRequest request) {
        return reviewService.accept(id, request != null ? request : new AcceptRecordRequest(null, null, null));
    }

    @PostMapping("/records/{id}/reject")
    public ExtractedRecordResponse reject(@PathVariable UUID id) {
        return reviewService.reject(id);
    }
}
```

- [ ] **Step 5: Verify it boots and the endpoints answer**

Start the app on 8099 as in Task 6, then confirm the route is registered and guarded:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8099/api/v1/extraction/documents
```

Expected: `401` or `403` — not `404`. A `404` means the controller was not picked up.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/extraction/
git commit -m "feat(extraction): review queue and accept/reject commit path"
```

---

### Task 8: Review screen

**Files:**
- Create: `frontend/src/app/core/extraction/extraction-api.service.ts`
- Create: `frontend/src/app/core/extraction/extraction.model.ts`
- Create: `frontend/src/app/screens/workspace/extraction/extraction.component.ts`
- Modify: `frontend/src/app/app.routes.ts` (add the route)

**Interfaces:**
- Consumes: the Task 7 endpoints.
- Produces: route `/extraction`; `ExtractionApiService.list()`, `.get(id)`, `.upload(file)`, `.retry(id)`, `.accept(recordId, body)`, `.reject(recordId)`.

Follow the existing screens' conventions: standalone component, signals for state, inline template, inline styles — match `activity.component.ts` and `indicators-api.service.ts` rather than introducing a new style.

- [ ] **Step 1: Write the model**

```typescript
export type ExtractionStatus = 'PENDING' | 'EXTRACTING' | 'READY' | 'FAILED';
export type ExtractionTargetType = 'EMISSION_ACTIVITY' | 'INDICATOR_VALUE';
export type RecordStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED';

export interface ExtractedRecordResponse {
  id: string;
  targetType: ExtractionTargetType;
  targetId: string;
  targetName: string;
  value: number;
  unitAsRead: string | null;
  fiscalYear: number;
  month: number | null;
  confidence: number | null;
  sourceSnippet: string | null;
  status: RecordStatus;
}

export interface ExtractedDocumentResponse {
  id: string;
  originalFileName: string;
  status: ExtractionStatus;
  failureReason: string | null;
  uploadedBy: string;
  createdAt: string;
  records: ExtractedRecordResponse[];
}
```

- [ ] **Step 2: Write the API service**

Match `indicators-api.service.ts`, including leaving `Content-Type` unset on upload so the browser adds the multipart boundary:

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { ExtractedDocumentResponse, ExtractedRecordResponse } from './extraction.model';

@Injectable({ providedIn: 'root' })
export class ExtractionApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/extraction`;

  list(): Observable<ExtractedDocumentResponse[]> {
    return this.http.get<ExtractedDocumentResponse[]>(`${this.base}/documents`);
  }

  get(id: string): Observable<ExtractedDocumentResponse> {
    return this.http.get<ExtractedDocumentResponse>(`${this.base}/documents/${id}`);
  }

  upload(file: File): Observable<ExtractedDocumentResponse> {
    const form = new FormData();
    form.append('file', file);
    // Content-Type is left unset so the browser adds the multipart boundary.
    return this.http.post<ExtractedDocumentResponse>(`${this.base}/documents`, form);
  }

  retry(id: string): Observable<ExtractedDocumentResponse> {
    return this.http.post<ExtractedDocumentResponse>(`${this.base}/documents/${id}/retry`, {});
  }

  accept(recordId: string, body: { value?: number; fiscalYear?: number; month?: number }): Observable<ExtractedRecordResponse> {
    return this.http.post<ExtractedRecordResponse>(`${this.base}/records/${recordId}/accept`, body);
  }

  reject(recordId: string): Observable<ExtractedRecordResponse> {
    return this.http.post<ExtractedRecordResponse>(`${this.base}/records/${recordId}/reject`, {});
  }
}
```

`API_BASE` from `../http/api-base` is what every other API service in this codebase imports — there is no `environment.apiBase`.

- [ ] **Step 3: Write the screen**

Read `activity.component.ts` first and match its styling conventions — this codebase uses inline templates with inline style attributes, not separate `.html`/`.css` files.

```typescript
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { ExtractionApiService } from '../../../core/extraction/extraction-api.service';
import { ExtractedDocumentResponse, ExtractedRecordResponse } from '../../../core/extraction/extraction.model';
import { UiService } from '../../../core/ui.service';

@Component({
  selector: 'app-extraction',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding:24px;max-width:1100px;">
      <h2 style="font-size:18px;font-weight:700;margin:0 0 4px;">Document Extraction</h2>
      <p style="color:#64726B;font-size:13.5px;margin:0 0 18px;">
        Upload a utility bill or invoice. Nothing is written to your data until you accept it.
      </p>

      <input type="file" (change)="onFile($event)"
        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv,.docx"
        style="margin-bottom:20px;">

      <div *ngIf="!documents().length" style="color:#8A968F;font-size:13.5px;">
        No documents uploaded yet.
      </div>

      <div *ngFor="let doc of documents()"
        style="background:#fff;border:1px solid #E9ECE6;border-radius:14px;padding:16px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <strong style="font-size:14px;">{{ doc.originalFileName }}</strong>
          <span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:7px;background:#F3F5F1;color:#64726B;">
            {{ doc.status }}
          </span>
          <button *ngIf="doc.status === 'FAILED'" (click)="retry(doc)"
            style="margin-left:auto;height:30px;padding:0 10px;border-radius:8px;border:1.5px solid #E5E8E1;background:#fff;cursor:pointer;font-size:12px;">
            Retry
          </button>
        </div>

        <div *ngIf="doc.failureReason" style="color:#8C3A2E;font-size:12.5px;margin-bottom:8px;">
          {{ doc.failureReason }}
        </div>

        <div *ngIf="doc.status === 'READY' && !doc.records.length" style="color:#8A968F;font-size:13px;">
          Nothing usable was found in this document.
        </div>

        <div *ngFor="let rec of doc.records"
          style="display:grid;grid-template-columns:minmax(0,1fr) 120px 150px;gap:10px;align-items:center;padding:9px 0;border-top:1px solid #F2F4F0;">
          <div style="min-width:0;">
            <div style="font-size:12.5px;font-weight:600;">{{ rec.targetName }}</div>
            <div style="font-size:11px;color:#A9B3AD;margin-top:2px;">
              {{ rec.targetType === 'EMISSION_ACTIVITY' ? 'Emission activity' : 'Indicator' }}
              · FY{{ rec.fiscalYear }}
              <span *ngIf="rec.confidence"> · {{ (rec.confidence * 100).toFixed(0) }}% confident</span>
            </div>
            <div *ngIf="rec.sourceSnippet" style="font-size:11px;color:#8A968F;margin-top:3px;font-style:italic;">
              “{{ rec.sourceSnippet }}”
            </div>
          </div>

          <input #val type="number" [value]="rec.value"
            [disabled]="rec.status !== 'PROPOSED'"
            style="height:34px;padding:0 8px;border:1.5px solid #E5E8E1;border-radius:8px;width:100%;box-sizing:border-box;font-size:12px;">

          <div style="display:flex;gap:6px;">
            <ng-container *ngIf="rec.status === 'PROPOSED'; else reviewed">
              <button (click)="accept(rec, val.value)"
                style="flex:1;height:34px;border-radius:8px;border:none;background:linear-gradient(90deg,#4C96B3,#A99FDB);color:#fff;cursor:pointer;font-size:12px;font-weight:600;">
                Accept
              </button>
              <button (click)="reject(rec)"
                style="flex:1;height:34px;border-radius:8px;border:1.5px solid #F0C4BC;background:#fff;color:#8C3A2E;cursor:pointer;font-size:12px;">
                Reject
              </button>
            </ng-container>
            <ng-template #reviewed>
              <span style="font-size:11.5px;font-weight:700;color:#64726B;">{{ rec.status }}</span>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ExtractionComponent implements OnInit, OnDestroy {
  private api = inject(ExtractionApiService);
  private ui = inject(UiService);

  documents = signal<ExtractedDocumentResponse[]>([]);
  private poll?: Subscription;

  ngOnInit() {
    this.refresh();
    // Extraction runs off the request thread, so the queue is polled until every
    // document reaches a terminal state, then polling stops.
    this.poll = interval(2000).subscribe(() => {
      if (this.documents().some((d) => d.status === 'PENDING' || d.status === 'EXTRACTING')) {
        this.refresh();
      }
    });
  }

  ngOnDestroy() {
    this.poll?.unsubscribe();
  }

  refresh() {
    this.api.list().subscribe((docs) => this.documents.set(docs));
  }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.api.upload(file).subscribe({
      next: () => {
        input.value = '';
        this.refresh();
      },
      error: (err) => this.ui.showToast(err?.error?.message ?? 'Upload failed'),
    });
  }

  retry(doc: ExtractedDocumentResponse) {
    this.api.retry(doc.id).subscribe(() => this.refresh());
  }

  accept(rec: ExtractedRecordResponse, rawValue: string) {
    const value = Number(rawValue);
    this.api.accept(rec.id, { value: Number.isFinite(value) ? value : undefined }).subscribe({
      next: () => this.refresh(),
      // A 409 here is the sign-off guard; its message names the year and explains itself.
      error: (err) => this.ui.showToast(err?.error?.message ?? 'Could not accept this record'),
    });
  }

  reject(rec: ExtractedRecordResponse) {
    this.api.reject(rec.id).subscribe(() => this.refresh());
  }
}
```

`UiService.showToast` is the method used elsewhere for this — see `evidence-drawer.component.ts`.

- [ ] **Step 4: Add the route**

In `app.routes.ts`, beside the other workspace children:

```typescript
      { path: 'extraction', loadComponent: () => import('./screens/workspace/extraction/extraction.component').then((m) => m.ExtractionComponent) },
```

- [ ] **Step 5: Verify it builds**

Run: `cd frontend && npx ng build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/core/extraction/ frontend/src/app/screens/workspace/extraction/ frontend/src/app/app.routes.ts
git commit -m "feat(extraction): document upload and review screen"
```

---

### Task 9: End-to-end verification

**Files:**
- Create: `frontend/e2e/extraction.spec.ts` (match the location and style of the existing Playwright specs)

**Interfaces:**
- Consumes: everything above.
- Produces: no code other tasks depend on.

- [ ] **Step 1: Verify the whole backend suite passes**

Run: `cd backend && mvn -o test`
Expected: PASS — the two pre-existing tests plus `UnitConverterTest` (7), `ProposalValidatorTest` (6), `SignOffGuardTest` (4).

- [ ] **Step 2: Exercise the real pipeline by hand**

Start Postgres and the backend, log in through the UI, open `/extraction`, and upload any PDF. Expected: the document appears immediately, flips from `PENDING` through `EXTRACTING` to `READY` within a few seconds, and shows two proposals from the stub — an emission-activity proposal against `GRID_ELECTRICITY_MY` and an indicator proposal against `IND-ENG-01`.

- [ ] **Step 3: Accept both and confirm they landed**

Accept both proposals. Expected: the activity log shows a new entry with a calculated tCO₂e of `1240 × 0.585 ÷ 1000 = 0.7254`, and the indicators screen shows `IND-ENG-01` at `1.24` MWh with an audit entry naming the uploaded file as its source.

- [ ] **Step 4: Confirm the sign-off guard**

Sign off the fiscal year in the assurance screen, upload another document, and try to accept an indicator proposal into that year. Expected: `409` and the message naming the year, with no new indicator value written.

- [ ] **Step 5: Write the Playwright spec**

Check the existing specs for the login helper and `test.use` conventions and follow them; the shape below assumes a `loginAs` helper like the other specs have.

```typescript
import { expect, test } from '@playwright/test';
import path from 'path';

test('uploads a document, reviews the proposals, and commits them', async ({ page }) => {
  await loginAs(page, 'starter');

  await page.goto('/extraction');
  await page.setInputFiles('input[type="file"]', path.join(__dirname, 'fixtures/electricity-bill.pdf'));

  // Extraction is asynchronous; the queue polls itself, so wait for the terminal state.
  await expect(page.getByText('READY')).toBeVisible({ timeout: 20000 });

  // The stub proposes one emission-activity record and one indicator record.
  await expect(page.getByText('Grid Electricity (Peninsular Malaysia)')).toBeVisible();
  await expect(page.getByText('Total Electricity Consumed')).toBeVisible();

  const acceptButtons = page.getByRole('button', { name: 'Accept' });
  await expect(acceptButtons).toHaveCount(2);
  await acceptButtons.first().click();
  await expect(page.getByText('ACCEPTED')).toBeVisible();
  await page.getByRole('button', { name: 'Accept' }).first().click();

  // 1240 kWh x 0.585 / 1000 = 0.7254 tCO2e
  await page.goto('/activity');
  await expect(page.getByText('0.7254')).toBeVisible();

  await page.goto('/indicators');
  await expect(page.getByText('1.24')).toBeVisible();
});
```

Add a small fixture PDF at `frontend/e2e/fixtures/electricity-bill.pdf`. Its contents do not matter while the stub extractor is in place — it only has to be a valid, allowed file type.

- [ ] **Step 6: Commit**

```bash
git add frontend/e2e/extraction.spec.ts
git commit -m "test(extraction): end-to-end upload, review, and accept"
```

---

### Task 10: The real extractor — BLOCKED

**This task cannot start until a provider and model are chosen and an API key is available.**

Everything above works without it: the stub keeps the pipeline whole, and the tests keep passing.

When unblocked:

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/extraction/CloudDocumentExtractor.java` (bean named `cloudDocumentExtractor`, so `StubDocumentExtractor`'s `@ConditionalOnMissingBean` stands down)
- Modify: `backend/src/main/resources/application.yml` (add the key under the existing `wesee:` block, sourced from an environment variable, never committed)

**Interfaces:**
- Consumes: `DocumentExtractor`, `ExtractionContext`, `ExtractionResult`, `ProposedRecord` (Task 3).
- Produces: an alternative `DocumentExtractor` bean. No other task changes.

Requirements when writing it:

1. Send `context.factors()` and `context.indicators()` to the model as the closed set it must choose from, and require the response to name ids from those lists only.
2. Return a `sourceSnippet` for every proposal — the reviewer needs the line the number came from.
3. Wrap provider failures and timeouts in `ExtractionFailedException`; the worker turns that into a `FAILED` document with a retry, which already works.
4. Set `ExtractionResult.modelUsed` to the actual model identifier so `extracted_document.model_used` records provenance.
5. Confirm whether the provider accepts PDFs natively. If not, converting a PDF to page images belongs **inside** this class — nothing outside the seam should learn about it.
6. Add no test that makes a network call. The existing tests keep using the stub.

---

## Notes for the executor

- The backend boots for verification with `mvn -o spring-boot:run -Dspring-boot.run.fork=false -Dspring-boot.run.arguments=--server.port=8099`. Forked, the log never reaches the redirect and the run looks hung; port 8080 is usually occupied by `make backend`.
- Startup is the only real check that Spring Data can derive a new finder name — `mvn compile` does not validate them, and a bad property path throws `PropertyReferenceException` at boot.
- The working tree may already contain an unrelated repository-ordering change. Keep those files out of these commits.
