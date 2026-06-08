SHELL := /bin/bash
# ---- Réglages projet ----
SAIL     := sh vendor/bin/sail
DATE     := $(shell date +%Y%m%d-%H%M%S)
# DB par défaut (Sail avec MySQL)
DB       ?= sail
DB_USER  ?= sail
DB_PASS  ?= password
# Paramètres optionnels
service  ?=
cmd      ?=
FILE     ?=
.PHONY: help up down destroy restart build rebuild ps logs \
        shell root-shell art comp npm dev build-frontend \
        migrate fresh seed tinker test cache-clear cache-optimize storage-link \
        queue-work queue-restart horizon-start horizon-stop \
        scheduler-start scheduler-stop \
        db-shell db-dump db-restore pma mailpit \
        deps deps-update update install prune install-full
help:
	@echo "Commandes utiles:"
	@echo "  make up              - Démarrer la stack (detached)"
	@echo "  make down            - Arrêter la stack"
	@echo "  make destroy         - Arrêter + supprimer volumes"
	@echo "  make restart         - Redémarrer"
	@echo "  make build           - Rebuild images"
	@echo "  make rebuild         - Rebuild sans cache"
	@echo "  make ps              - Lister services"
	@echo "  make logs [service=] - Logs (optionnel: service=phpmyadmin/mysql/...)"
	@echo "  make shell           - Shell dans le conteneur app"
	@echo "  make root-shell      - Shell root dans le conteneur app"
	@echo "  make art cmd='...'   - Artisan (ex: cmd='migrate --seed')"
	@echo "  make comp cmd='...'  - Composer (ex: cmd='update')"
	@echo "  make npm cmd='...'   - NPM (ex: cmd='run dev')"
	@echo "  make dev             - Vite (HMR)"
	@echo "  make build-frontend  - Build front (Vite)"
	@echo "  make migrate|fresh|seed|tinker|test|cache-clear|storage-link"
	@echo "  make queue-work|queue-restart"
	@echo "  make horizon-start|horizon-stop"
	@echo "  make scheduler-start|scheduler-stop"
	@echo "  make db-shell        - CLI MySQL"
	@echo "  make db-dump         - Dump -> dumps/$(DB)-$(DATE).sql"
	@echo "  make db-restore FILE=dumps/xxx.sql"
	@echo "  make pma             - Démarrer phpMyAdmin"
	@echo "  make mailpit         - Démarrer Mailpit"
	@echo "  make deps            - composer install + npm install"
	@echo "  make deps-update     - composer update + npm update"
	@echo "  make update          - pull/build + install deps + migrate"
	@echo "  make install         - key:generate + migrate + storage:link"
	@echo "  make prune           - docker system prune -f"
	@echo "  make install-full    - Installation complète du projet"
# ----- Cycle de vie -----
up:
	$(SAIL) up -d
down:
	$(SAIL) down
destroy:
	$(SAIL) down -v
restart: down up
build:
	$(SAIL) build

rebuild:
	$(SAIL) build --no-cache

ps:
	$(SAIL) ps

logs:
	$(SAIL) logs -f $(service)

shell:
	$(SAIL) shell

root-shell:
	$(SAIL) root-shell

# ----- Dev quotidien -----
art:
	$(SAIL) artisan $(cmd)

comp:
	$(SAIL) composer $(cmd)

npm:
	$(SAIL) npm $(cmd)

dev:
	$(SAIL) npm run dev

build-frontend:
	$(SAIL) npm run build

migrate:
	$(SAIL) artisan migrate

fresh:
	$(SAIL) artisan migrate:fresh --seed

seed:
	$(SAIL) artisan db:seed

tinker:
	$(SAIL) artisan tinker

test:
	$(SAIL) artisan test

cache-clear:
	$(SAIL) artisan optimize:clear

cache-optimize:
	$(SAIL) artisan optimize

storage-link:
	$(SAIL) artisan storage:link

queue-work:
	$(SAIL) artisan queue:work

queue-restart:
	$(SAIL) artisan queue:restart

# ----- Services optionnels -----
horizon-start:
	$(SAIL) up -d horizon

horizon-stop:
	$(SAIL) stop horizon || true
scheduler-start:
	$(SAIL) up -d scheduler

scheduler-stop:
	$(SAIL) stop scheduler || true

# ----- Base de données -----
db-shell:
	$(SAIL) exec mysql mysql -u$(DB_USER) -p$(DB_PASS) $(DB)

db-dump:
	mkdir -p dumps
	$(SAIL) exec mysql mysqldump -u$(DB_USER) -p$(DB_PASS) $(DB) > dumps/$(DB)-$(DATE).sql
	@echo "Dump créé dans dumps/"

db-restore:
ifndef FILE
	$(error FILE non défini. Utilise: make db-restore FILE=dumps/xxx.sql)
endif
	$(SAIL) exec -T mysql sh -lc "mysql -u$(DB_USER) -p$(DB_PASS) $(DB)" < $(FILE)

# ----- Outils -----
pma:
	$(SAIL) up -d phpmyadmin

ssh:
	$(SAIL) shell

mailpit:
	$(SAIL) up -d mailpit

deps:
	$(SAIL) composer install --no-interaction --prefer-dist
	$(SAIL) npm install

deps-update:
	$(SAIL) composer update
	$(SAIL) npm update

update:
	$(SAIL) pull || true
	$(SAIL) build
	$(SAIL) composer install --no-interaction --prefer-dist
	$(SAIL) npm install
	$(SAIL) artisan migrate --force

install:
	$(SAIL) artisan key:generate
	$(SAIL) artisan migrate
	$(SAIL) artisan storage:link

prune:
	docker system prune -f

install-full:
	@if [ ! -f vendor/bin/sail ]; then \
		composer install --no-interaction --prefer-dist; \
	fi
	@if [ ! -f vendor/bin/sail ]; then \
		composer require laravel/sail --dev; \
	fi
	./vendor/bin/sail npm install
	./vendor/bin/sail up -d
	./vendor/bin/sail artisan key:generate
	./vendor/bin/sail artisan migrate
	./vendor/bin/sail artisan storage:link
	@echo "---------------------------------------------"
	@echo "Projet prêt !"
	@echo "Application : http://localhost:9080"
	@echo "Vite (HMR)   : http://localhost:51731"
	@echo "phpMyAdmin   : http://localhost:18080"
	@echo "Mailpit      : http://localhost:18025"
	@echo "---------------------------------------------"