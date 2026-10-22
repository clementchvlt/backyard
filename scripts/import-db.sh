#!/bin/sh
# Importe une sauvegarde SQL (ex. l'export Railway) dans la base du site.
#   sh scripts/import-db.sh /chemin/vers/railway.sql
# À lancer AVANT le premier démarrage du site : la base doit être vide.
set -e
cd "$(dirname "$0")/.."

file="$1"
[ -f "$file" ] || { echo "Fichier introuvable : $file" >&2; exit 1; }
[ -f .env ] || { echo "Lance d'abord scripts/vps-init-env.sh" >&2; exit 1; }

db=$(grep '^DB_DATABASE=' .env | cut -d= -f2-)
user=$(grep '^DB_USERNAME=' .env | cut -d= -f2-)
pass=$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)

tables=$(docker exec -e MYSQL_PWD="$pass" mysql mysql -N -u"$user" "$db" -e 'SHOW TABLES' | wc -l)
if [ "$tables" -gt 0 ]; then
    echo "La base « $db » contient déjà $tables table(s) : import annulé." >&2
    echo "(Pour repartir de zéro : docker compose -f docker-compose.prod.yml down, vider la base, relancer.)" >&2
    exit 1
fi

docker exec -i -e MYSQL_PWD="$pass" mysql mysql -u"$user" "$db" < "$file"

echo "==> Import terminé. Contenu de la base :"
docker exec -e MYSQL_PWD="$pass" mysql mysql -u"$user" "$db" -e "
SELECT 'courses' AS t, COUNT(*) AS n FROM races
UNION ALL SELECT 'participants', COUNT(*) FROM participants
UNION ALL SELECT 'passages', COUNT(*) FROM loop_arrivals
UNION ALL SELECT 'utilisateurs', COUNT(*) FROM users;"
