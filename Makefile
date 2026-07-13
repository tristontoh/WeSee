.PHONY: infra backend frontend dev

infra:        ## start Postgres (Docker) — or use your local Postgres
	docker compose -f infra/docker-compose.yml up -d

backend:       ## main API — Java Spring Boot on :8000 (auth, dashboard, Engine 01 ingest)
	cd backend && mvn spring-boot:run

frontend:      ## Angular app on :4210
	cd apps/frontend && npx ng serve --port 4210

dev:          ## reminder of the two processes to run
	@echo "Run in separate terminals: make backend  (:8000, Java) / make frontend  (:4210)"
