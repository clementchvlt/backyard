#!/bin/sh
# Lancé à chaque démarrage du conteneur de production.
set -e
cd /app

# 1. Migrations (on attend que MySQL soit prêt)
tries=0
until php artisan migrate --force; do
    tries=$((tries + 1))
    if [ "$tries" -ge 30 ]; then
        echo '!! base de données injoignable, abandon des migrations' >&2
        break
    fi
    echo "==> base pas prête, nouvel essai dans 3s ($tries/30)"
    sleep 3
done

# 2. Lien public/storage -> storage/app/public (photos des participants)
php artisan storage:link >/dev/null 2>&1 || true

# 3. Caches de production
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec "$@"
