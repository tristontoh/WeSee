SHELL := /bin/bash
.PHONY: infra backend frontend dev bundle serve clean-bundle

infra:        ## start Postgres (Docker) on :5432 with db wesee_esg — or use your local Postgres
	docker compose -f infra/docker-compose.yml up -d

backend:       ## main API — Java Spring Boot on :8080, routes under /api/v1 (auth, indicators, targets, assurance, governance)
	cd backend && mvn spring-boot:run

frontend:      ## React app (Vite) on :4210 — talks to the API on :8080
	cd frontend && npm run dev -- --port 4210

dev:          ## reminder of the two processes to run
	@echo "Run in separate terminals: make backend  (:8080, Java) / make frontend  (:4210)"

bundle:       ## build the client into the API's static folder, so :8080 serves the whole app
	cd frontend && npm run build
	rm -rf backend/src/main/resources/static
	mkdir -p backend/src/main/resources/static
	cp -R frontend/dist/. backend/src/main/resources/static/
	@echo "bundled $$(ls backend/src/main/resources/static/assets | wc -l | tr -d ' ') asset(s) into backend/src/main/resources/static"

serve: bundle ## bundle the client, then run the API serving it on :8080 as one origin
	cd backend && mvn spring-boot:run

clean-bundle: ## drop the bundled client; the API keeps working, :8080 just stops serving the app
	rm -rf backend/src/main/resources/static

tidy:         ## delete iCloud's duplicate copies ("Xxx 2.java") where the original still exists
	@# Loud on purpose. A .gitignore pattern for these would also swallow a file legitimately
	@# named "Scope 3.md" or "Phase 2.sql" — and this project's vocabulary is full of both.
	@# Silently missing from git is a worse failure than a duplicate you can see.
	@found=0; \
	while IFS= read -r dup; do \
	  orig=$$(printf '%s' "$$dup" | sed -E 's/ [0-9]+(\.[^.]+)?$$/\1/'); \
	  if [ -e "$$orig" ] && [ "$$orig" != "$$dup" ]; then \
	    echo "  removing $$dup"; rm -rf "$$dup"; found=$$((found+1)); \
	  fi; \
	done < <(find . -name "* [0-9]*" -not -path "./.git/*" -not -path "*/node_modules/*" \
	           -not -path "*/target*" -not -path "./ESGPlatform-main/*" 2>/dev/null); \
	if [ $$found -eq 0 ]; then echo "  nothing to tidy"; else echo "  $$found removed"; fi
