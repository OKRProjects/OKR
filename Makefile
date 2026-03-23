.PHONY: help kill run rerun up down logs ps build check-ports

# Prefer docker-compose if installed; otherwise use docker compose.
COMPOSE := $(shell command -v docker-compose >/dev/null 2>&1 && echo docker-compose || echo "docker compose")

# Comprueba que el host tenga libres 3000 (frontend) y 5001 (backend) antes de levantar Docker.
check-ports:
	@if lsof -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then \
		echo "Error: el puerto 3000 está en uso (el frontend debe usar 3000). Proceso:"; \
		lsof -iTCP:3000 -sTCP:LISTEN; \
		echo "Cierra ese proceso (p. ej. kill PID) o para otro contenedor que use 3000."; \
		exit 1; \
	fi
	@if lsof -iTCP:5001 -sTCP:LISTEN >/dev/null 2>&1; then \
		echo "Error: el puerto 5001 está en uso (el backend debe usar 5001)."; \
		lsof -iTCP:5001 -sTCP:LISTEN; \
		exit 1; \
	fi
	@echo "Puertos 3000 y 5001 libres."

help:
	@echo "Targets:"
	@echo "  make run    - Build and start all services (foreground)"
	@echo "  make kill   - Stop all services (docker compose down)"
	@echo "  make rerun  - kill + run (rebuild and start)"
	@echo "  make check-ports - Verifica que 3000 y 5001 estén libres en tu Mac"
	@echo "  make logs   - Follow logs"
	@echo "  make ps     - Show container status"

kill: down

run: up

rerun: kill run

up: check-ports
	@$(COMPOSE) up --build

down:
	@$(COMPOSE) down --remove-orphans

build:
	@$(COMPOSE) build

logs:
	@$(COMPOSE) logs -f --tail=200

ps:
	@$(COMPOSE) ps
