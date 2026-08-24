# Document Extraction — Design

**Date:** 2026-08-24
**Status:** Approved design, pending implementation plan

## Goal

Let a company upload a source document — a utility bill, fuel invoice, water statement — and
have the platform read it and propose the records it implies, for a human to confirm. Today
`IndicatorEvidenceService` stores uploaded files and never reads them; evidence is attached
*after* a value is typed by hand. This inverts that: the document comes first and the values
follow from it.

Extraction feeds **two destinations through one pipeline**. A single electricity bill implies
both an `EmissionActivityEntry` (1,240 kWh against `GRID_ELECTRICITY_MY` → tCO₂e, Scope 2) and
an `IndicatorValue` for `IND-ENG-01 Total Electricity Consumed` (1.24 MWh). Both are proposed
together and confirmed together.

## Decisions taken

**Cloud extraction, behind a swappable interface.** A hosted model reads the documents. The
alternative — local parsing plus per-vendor templates — was rejected because the upload
allowlist already accepts `png`/`jpg`, so photographed bills are a normal case that a text
parser cannot read at all; because Malaysian utility formats vary by vendor and change, making
templates a maintenance treadmill; and because the volume (roughly 12–50 documents per tenant
per year) makes per-document cost irrelevant. The engine sits behind a one-method interface so
an on-premise implementation is a contained swap if a tenant ever requires one. Building that
second engine now is out of scope.

**Staging, not direct-to-draft.** Extracted values land in staging tables and enter the real
tables only on human acceptance. Writing straight into `IndicatorValue` as `DRAFT` was rejected
because the assurance module computes a tamper-evident SHA-256 over indicator values — machine
output must not be able to enter that set unreviewed — and because one document proposing two
records needs a single place to confirm the pair.

## Data model

Two tables, both extending `TenantOwnedEntity` so the `companyFilter` tenant isolation applies.
Migration `V52`.

### `extracted_document`

One row per uploaded document.

| Column | Notes |
|---|---|
| `id`, `company_id` | from `TenantOwnedEntity` |
| `original_file_name` | as supplied by the client, never used to build a path |
| `stored_path` | relative to the uploads root |
| `status` | `PENDING` \| `EXTRACTING` \| `READY` \| `FAILED` |
| `failure_reason` | null unless `FAILED` |
| `uploaded_by` | display name, matching `IndicatorAuditEntry.enteredBy` |
| `model_used`, `extracted_at` | provenance for audit |

### `extracted_record`

One row per proposed record; a document yields several.

| Column | Notes |
|---|---|
| `id`, `company_id` | |
| `document_id` | FK → `extracted_document` |
| `target_type` | `EMISSION_ACTIVITY` \| `INDICATOR_VALUE` |
| `emission_factor_id` | FK → `emission_factor`; set when `EMISSION_ACTIVITY` |
| `quantity` | set when `EMISSION_ACTIVITY` |
| `indicator_definition_id` | FK → `indicator_definition`; set when `INDICATOR_VALUE` |
| `month` | null = annual value; set when `INDICATOR_VALUE` |
| `fiscal_year`, `value`, `unit_as_read` | shared |
| `confidence`, `source_snippet` | why the model proposed this |
| `status` | `PROPOSED` \| `ACCEPTED` \| `REJECTED` |
| `committed_entity_id` | the real row created on acceptance |

**Typed columns rather than a JSON payload.** Half the columns apply per `target_type`, which is
mildly awkward, but it lets Postgres enforce foreign keys to `emission_factor` and
`indicator_definition` — extraction can never propose an identifier that does not exist — and
keeps the review queue queryable. The codebase has no JSON-column precedent.

**No stored "reviewed" flag.** Whether a document still needs attention is derivable from whether
any of its records remain `PROPOSED`. Storing it as well would create two sources of truth.

**One physical copy of the file.** On acceptance the file is not moved or duplicated; the new
`IndicatorAuditEntry` simply points `sourceDocName`/`sourceDocPath` at the extraction path. Those
fields already exist, so extracted values land in the existing audit trail with provenance,
structurally identical to a manual entry with evidence attached.

## Pipeline

```
POST /extraction/documents (multipart)
  → validate: extension in allowlist, size ≤ 10MB
  → store under uploads/extraction/{companyId}/{documentId}/
  → row status PENDING, return document id immediately
        ↓  Spring @Async
  status EXTRACTING
  → DocumentExtractor.extract(...)
  → validate results against the closed set
  → write extracted_record rows
  → status READY   (or FAILED + failure_reason)
        ↓
client polls GET /extraction/documents/{id} until terminal
```

`@Async` rather than a job queue: no new infrastructure, and it matches the current
single-process deployment. This does not survive horizontal scaling — a second instance would
not pick up work abandoned by a crashed one. If the deployment ever scales out, this becomes an
outbox table plus a poller. Recorded here so the limitation is a known one rather than a
surprise.

A `FAILED` document can be retried; retrying clears any records from the previous attempt.

## The extractor seam

```java
public interface DocumentExtractor {
    ExtractionResult extract(byte[] content, String contentType, ExtractionContext context);
}
```

`ExtractionContext` carries the tenant's available emission factors and applicable indicator
definitions. The model chooses from a **closed set** rather than inventing identifiers, and
every identifier it returns is validated against that set before becoming a row. Model output
is never trusted as a foreign key: an unrecognised identifier drops the record rather than
failing the document.

Unit normalisation is a separate pure function — a bill reads kWh, `IND-ENG-01` is denominated
in MWh — with `unit_as_read` preserving what the document actually said, so a reviewer can see
both the reading and the conversion.

## Review and commit

| Endpoint | Purpose |
|---|---|
| `GET /extraction/documents` | the review queue |
| `GET /extraction/documents/{id}` | one document, its records, and status |
| `POST /extraction/documents` | upload |
| `POST /extraction/documents/{id}/retry` | re-run a `FAILED` document |
| `PATCH /extraction/records/{id}` | accept (with optional corrections) or reject |

Accepting an `EMISSION_ACTIVITY` record goes through the existing `EmissionActivityService` so
the tCO₂e calculation is not duplicated. Accepting an `INDICATOR_VALUE` record creates a `DRAFT`
`IndicatorValue` (or `IndicatorMonthlyValue` when `month` is set) plus the `IndicatorAuditEntry`
carrying the source document.

A reviewer may correct the value, factor, indicator, or fiscal year before accepting. The
corrected values are what commit; the original proposal stays on the `extracted_record` for
audit.

**Who may accept.** Any workspace user who can enter indicator data may upload and accept,
because acceptance produces a `DRAFT` value — exactly what manual entry produces. Approval
stays a separate `COMPANY_ADMIN` step through the existing indicator flow. Extraction therefore
adds no new privilege: it changes how a draft is produced, not who can approve one.

**Sign-off guard.** A record cannot be committed into a fiscal year that already has a
`SignOffRecord`. The assurance hash is computed over that year's indicator values, so allowing
extraction to write into a signed year would silently invalidate the tamper-evidence check.
Attempting it returns `409` with an explanation, consistent with the existing wrong-mode-save
behaviour.

## Error handling

| Case | Behaviour |
|---|---|
| Unsupported extension, oversized file | `400` at upload, nothing stored |
| Extractor timeout or provider outage | document → `FAILED`, reason shown, retry offered |
| Model returns an unknown identifier | that record is dropped; the rest of the document proceeds |
| Model returns nothing usable | document → `READY` with zero records, shown as "nothing found" |
| Accept into a signed fiscal year | `409` with the reason |

Reusing M1's interceptor and `toApiError` throughout.

## Security and privacy

- Path traversal: stored names are UUID-generated and the resolved path is checked against the
  uploads root — the same guard as `IndicatorEvidenceService`.
- Tenant isolation: both tables extend `TenantOwnedEntity`, and service methods take the
  company id from `CurrentUserProvider` as elsewhere.
- **Account closure needs no new code.** `PrivacyService.closeAccount` deliberately deactivates
  rather than deletes — every `company_id` foreign key is `ON DELETE RESTRICT`, so a hard delete
  would mean unwinding ~20 tables. Extraction rows follow the same model as every other tenant
  table: they become unreachable when the company is deactivated. Uploaded files persist on
  disk exactly as today's evidence files do. No cascade is added, and none should be — doing so
  for extraction alone would make it the sole table with delete-on-close semantics.
- **Provider data handling:** documents leave the platform. What the provider retains, and for
  how long, must be documented and disclosed to tenants before the feature is enabled for real
  customers. This is the one genuinely new privacy obligation the feature introduces, and it is
  a policy commitment rather than code.

## Testing

- **Unit, no DB:** unit conversion; validation of model output against the closed set; the
  sign-off guard predicate.
- **Integration:** a stub `DocumentExtractor` returning canned results, so the suite never
  makes a network call. Covers upload → `READY` → accept → real record created, and the
  `FAILED` → retry path.
- **Playwright:** upload a fixture bill, see it appear in the review queue, accept both proposed
  records, confirm they appear in the activity log and the indicator grid.

## Decision required before implementation

The extraction provider and model are **not yet chosen**. This needs settling first because it
determines whether native PDF input is available or whether documents must be converted to
images first, which changes the shape of `DocumentExtractor`'s implementation.

Required to proceed:

1. Provider and model selection, with current pricing and PDF/vision input support verified
   against live documentation rather than recalled.
2. An API key, supplied via environment variable in the `wesee:` config block alongside the
   existing `jwt` and `uploads` settings — never committed.

## Out of scope

- A local or on-premise extraction engine. The interface makes it addable; nothing more.
- Bulk upload of many documents at once. Single document per request; the queue view will
  make multi-document review comfortable enough without it.
- Extracting from sustainability reports or any document type beyond bills and invoices.
- Trust Score, the third orphaned nav entry. Unrelated to extraction.
