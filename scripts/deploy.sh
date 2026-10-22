#!/bin/sh
# Mise à jour du site sur le VPS, depuis /srv/sites/backyard :
#   sh scripts/deploy.sh
set -e
cd "$(dirname "$0")/.."

echo "==> Récupération du code (branche main)"
git pull --ff-only origin main

echo "==> Construction et redémarrage"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Nettoyage des anciennes images"
docker image prune -f >/dev/null

docker compose -f docker-compose.prod.yml ps
echo "==> Site mis à jour."
