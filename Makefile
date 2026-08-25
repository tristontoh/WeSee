.PHONY: infra backend backend-e2e frontend dev

infra:        ## start Postgres (Docker) on :5432 with db wesee_esg — or use your local Postgres
	docker compose -f infra/docker-compose.yml up -d

backend:       ## main API — Java Spring Boot on :8080, routes under /api/v1 (auth, indicators, targets, assurance, governance)
	cd backend && mvn spring-boot:run

backend-e2e:   ## backend pointed at the e2e Gemini mock — no real key needed, and what the extraction specs require
	cd backend && GEMINI_BASE_URL=http://localhost:8099 GEMINI_API_KEY=e2e-not-a-real-key mvn spring-boot:run

frontend:      ## Angular app on :4210
	cd frontend && npx ng serve --port 4210

dev:          ## reminder of the two processes to run
	@echo "Run in separate terminals: make backend  (:8080, Java) / make frontend  (:4210)"
