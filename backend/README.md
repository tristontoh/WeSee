# WeSee Backend — Java Spring Boot

A Spring Boot (Java 21) port of the FastAPI gateway. It exposes the **same endpoints** the
Angular frontend calls, so the frontend needs no changes. This replaces the Python backend —
you no longer need FastAPI or the separate `carbon-intel` engine (Gemini is called directly).

## Run

```bash
cd backend
mvn spring-boot:run      # starts on http://localhost:8000
```

On first run Hibernate creates the tables and a seeder inserts demo data.
Demo logins (password `demo1234`): `workspace@demo.my` (Workspace dashboard), `buyer@demo.my` (Compliance Hub).

Then start the frontend in another terminal:

```bash
cd ../frontend && npx ng serve --port 4210   # open http://localhost:4210
```

## Config — all in `src/main/resources/application.properties`

**Which database** (native JDBC — no translation needed). Keep your real password out of
`application.properties` — put it in `application-local.properties` (gitignored) or `DB_PASSWORD`:
```
# application.properties (committed)
spring.datasource.url=jdbc:postgresql://localhost:5432/wesee
spring.datasource.username=postgres
spring.datasource.password=${DB_PASSWORD:postgres}

# application-local.properties (gitignored — your real secret)
spring.datasource.password=your-local-password
```

**Your Gemini key** (Engine 01 bill parsing). Blank = built-in mock extractor (no key needed):
```
wesee.gemini-api-key=AIza...your-key...
wesee.gemini-model=gemini-2.0-flash
```
A real key makes `POST /carbon/ingest` parse the actual uploaded bill via Gemini; otherwise a
deterministic demo bill (~+2.5 tCO₂e) is returned.

## Endpoints (match the frontend contract)

| Endpoint | Method | Notes |
|---|---|---|
| `/auth/login` | POST (form) | `username`,`password` → `{ access_token, token_type, org_type }` |
| `/dashboard/carbon` | GET (Bearer) | `{ total_tco2e, scope1, scope2, scope3, target_progress_pct, records[] }` |
| `/carbon/ingest` | POST (multipart, Bearer) | upload a bill → one certified emission record |
| `/health` | GET | liveness |

## Layout

```
model/     JPA entities (Organization, User, EmissionRecord, SupplierLink) + enums
repo/      Spring Data repositories
factors/   Malaysian emission-factor engine (malaysia_factors.json + FactorService)
llm/       Engine 01 extractor — mock + real Gemini over HTTP
ledger/    Decentralized carbon ledger (dev hash stub)
security/  JwtService (issue/verify)
web/       AuthController, DashboardController, CarbonController, DTOs
seed/      DataSeeder (demo orgs + emission records)
config/    CORS + BCrypt bean
```
