set dotenv-load := true

default: help

help:
	@just --list

install:
	(cd backend && npm install)
	(cd frontend && npm install)
	(cd crawler && cargo fetch)

build:
	(cd backend && npm run build)
	(cd frontend && npm run build)
	(cd crawler && cargo build)

test:
	@echo "backend: no test script configured"
	@echo "frontend: no test script configured"
	(cd crawler && cargo test)

test-e2e:
	(cd frontend && npm run test:e2e)

test-e2e-ui:
	(cd frontend && npm run test:e2e:ui)

lint:
	(cd backend && npm run lint)
	(cd frontend && npm run lint)
	(cd crawler && cargo clippy --all-targets --all-features)

format:
	(cd backend && npm run format)
	(cd frontend && npm run format)
	(cd crawler && cargo fmt)

ci: build lint test

backend-dev:
	(cd backend && npm run dev)

backend-start:
	(cd backend && npm run start)

backend-db-init:
	(cd backend && npm run db:init)

backend-db-migrate:
	(cd backend && npm run db:migrate)

frontend-dev:
	(cd frontend && npm run dev)

frontend-preview:
	(cd frontend && npm run preview)

crawler-run:
	(cd crawler && cargo run)

docker-up:
	docker compose up

docker-down:
	docker compose down

docker-build:
	docker compose build

clean:
	(cd backend && rm -rf dist)
	(cd frontend && rm -rf dist)
	(cd crawler && cargo clean)
