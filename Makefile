.PHONY: infra backend frontend dev

infra:        ## start Postgres (Docker) on :5432 with db wesee_esg — or use your local Postgres
	docker compose -f infra/docker-compose.yml up -d

backend:       ## main API — Java Spring Boot on :8080, routes under /api/v1 (auth, indicators, targets, assurance, governance)
	cd backend && mvn spring-boot:run

frontend:      ## React app (Vite) on :4210 — routes live behind a HashRouter, so /#/path
	cd frontend && npm run dev -- --port 4210

dev:          ## reminder of the two processes to run
	@echo "Run in separate terminals: make backend  (:8080, Java) / make frontend  (:4210)"
