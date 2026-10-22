# Image de PRODUCTION (VPS OVH). Le développement local continue d'utiliser Sail (compose.yaml).
# FrankenPHP = serveur web + PHP dans un seul conteneur. Le HTTPS et le nom de
# domaine sont gérés par le Caddy commun du VPS (/srv/infra).

# ---------- 1. Compilation du front (Vite / React) ----------
FROM node:22-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY vite.config.js tailwind.config.js postcss.config.js jsconfig.json ./
COPY resources ./resources
ENV VITE_APP_NAME="La Backyard des Mools"
RUN npm run build

# ---------- 2. Application Laravel ----------
FROM dunglas/frankenphp:1-php8.4-bookworm

ENV COMPOSER_ALLOW_SUPERUSER=1

RUN install-php-extensions pdo_mysql intl zip bcmath opcache pcntl \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY docker/prod/php.ini "$PHP_INI_DIR/conf.d/zz-backyard.ini"
COPY docker/prod/Caddyfile /etc/caddy/Caddyfile
COPY docker/prod/entrypoint.sh /usr/local/bin/backyard-entrypoint
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Dépendances PHP d'abord (cache Docker tant que composer.lock ne change pas)
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist

# Code + front compilé
COPY . .
COPY --from=assets /app/public/build ./public/build

RUN mkdir -p storage/app/public storage/app/private storage/framework/cache/data \
             storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && composer dump-autoload --optimize --no-dev \
    && chmod -R ug+rwX storage bootstrap/cache \
    && chmod +x /usr/local/bin/backyard-entrypoint

ENTRYPOINT ["/usr/local/bin/backyard-entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
