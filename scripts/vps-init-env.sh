#!/bin/sh
# À lancer UNE SEULE FOIS sur le VPS, dans /srv/sites/backyard :
#   sh scripts/vps-init-env.sh "$(sh /srv/infra/scripts/new-db.sh backyard)"
# (la commande entre $(...) crée la base de données et fournit son mot de passe)
set -e
cd "$(dirname "$0")/.."

db_pass="$1"
if [ -z "$db_pass" ]; then
    echo "Mot de passe de base de données manquant : voir DEPLOIEMENT-VPS.md." >&2
    exit 1
fi

if [ -f .env ]; then
    echo "Un fichier .env existe déjà : rien n'a été modifié."
    exit 0
fi

app_key="base64:$(openssl rand -base64 32)"
sed -e "s#^APP_KEY=.*#APP_KEY=${app_key}#" \
    -e "s#^DB_PASSWORD=.*#DB_PASSWORD=${db_pass}#" \
    docker/prod/env.example > .env
chmod 600 .env

echo "OK : fichier .env créé."
