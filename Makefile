.PHONY: infra backend backend-stub frontend dev

infra:        ## start Postgres (Docker) on :5432 with db wesee_esg — or use your local Postgres
	docker compose -f infra/docker-compose.yml up -d

backend:       ## main API — Java Spring Boot on :8080, routes under /api/v1 (auth, indicators, targets, assurance, governance)
	cd backend && mvn spring-boot:run

backend-stub:  ## backend with the fixed extractor — no GEMINI_API_KEY needed, and what the extraction e2e specs require
	cd backend && EXTRACTION_PROVIDER=stub mvn spring-boot:run

frontend:      ## Angular app on :4210
	cd frontend && npx ng serve --port 4210

dev:          ## reminder of the two processes to run
	@echo "Run in separate terminals: make backend  (:8080, Java) / make frontend  (:4210)"
