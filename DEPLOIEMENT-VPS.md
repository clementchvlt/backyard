# Mise en ligne de La Backyard des Mools sur le VPS OVH

Le site rejoint le VPS déjà en place pour La Pulperie (Caddy + MySQL
communs dans `/srv/infra`) :

```
/srv/infra/              ← commun (Caddy, MySQL, sites/*.caddy)
/srv/sites/la-pulperie/
/srv/sites/backyard/     ← ce site (conteneur « backyard-app »)
```

Adresse : **https://la-backyard-des-mools.fr** (et `www.`), HTTPS automatique.
Pas de Redis : sessions, cache et files d'attente sont en base MySQL.

Les commandes sont à copier-coller **une par une** dans Termius (connecté au
serveur), sauf mention contraire.

---

## 1. Faire pointer le domaine vers le VPS (espace client OVH)

**Web Cloud → Noms de domaine → la-backyard-des-mools.fr → Zone DNS.**

1. Supprime les enregistrements **A**, **AAAA** et **CNAME** existants pour
   le domaine nu (champ vide) et pour `www` (souvent l'ancienne adresse
   Railway ou la page de parking OVH). **Ne touche pas** aux enregistrements
   MX, SPF/TXT (e-mails).
2. **Ajouter une entrée → A** : sous-domaine vide, cible = adresse IP du VPS.
3. **Ajouter une entrée → A** : sous-domaine `www`, cible = adresse IP du VPS.

La propagation prend de quelques minutes à quelques heures. Vérification
(sur ton Mac) : `dig +short la-backyard-des-mools.fr` doit afficher l'IP du VPS.

## 2. Autoriser le serveur à lire le dépôt GitHub « backyard »

GitHub refuse d'utiliser la même clé de déploiement pour deux dépôts : on
crée une deuxième clé, réservée à Backyard.

```bash
ssh-keygen -t ed25519 -C "vps-ovh-backyard" -f ~/.ssh/backyard -N ""
cat ~/.ssh/backyard.pub
```

Copie la ligne affichée, puis sur GitHub : dépôt **backyard** → **Settings**
→ **Deploy keys** → **Add deploy key**. Titre `VPS OVH`, colle la clé, **ne
coche pas** « Allow write access », valide.

```bash
cat >> ~/.ssh/config <<'EOF'

Host github-backyard
    HostName github.com
    User git
    IdentityFile ~/.ssh/backyard
    IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
git clone git@github-backyard:clementchvlt/backyard.git /srv/sites/backyard
```

## 3. Créer la base et le fichier de réglages

```bash
cd /srv/sites/backyard
sh scripts/vps-init-env.sh "$(sh /srv/infra/scripts/new-db.sh backyard)"
```

→ « Base « backyard » prête. » puis « OK : fichier .env créé. »

## 4. Importer la sauvegarde Railway (avant le premier démarrage)

**Sur ton Mac** (Terminal), envoie le fichier sur le serveur — remplace
`ADRESSE_IP` (ou utilise le glisser-déposer SFTP de Termius vers `/tmp`) :

```bash
scp ~/Documents/Perso/Projets/Backyard/Documents/railway.sql ubuntu@ADRESSE_IP:/tmp/railway.sql
```

**Sur le serveur :**

```bash
cd /srv/sites/backyard
sh scripts/import-db.sh /tmp/railway.sql
```

→ affiche le nombre de courses, participants, passages et utilisateurs
importés (attendu : 1 course, 11 participants, 63 passages, 2 utilisateurs). Les comptes et mots de passe
existants restent valables.

```bash
rm /tmp/railway.sql
```

## 5. Lancer le site

```bash
cd /srv/sites/backyard
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f
```

Attends « Nothing to migrate » puis les lignes du serveur, et quitte les
logs avec **Ctrl + C**.

## 6. Brancher le domaine dans Caddy

```bash
cp /srv/sites/backyard/docker/prod/backyard.caddy /srv/infra/sites/
cd /srv/infra
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Ouvre **https://la-backyard-des-mools.fr**. Si le DNS n'est pas encore
propagé, Caddy réessaie tout seul d'obtenir le certificat HTTPS : patiente
et recharge plus tard.

---

## Mettre à jour le site

Après un `git push` depuis ton Mac :

```bash
cd /srv/sites/backyard && sh scripts/deploy.sh
```

## Créer un compte administrateur

```bash
cd /srv/sites/backyard
docker compose -f docker-compose.prod.yml exec app php artisan user:create --admin
```

## Sauvegarder la base

```bash
cd /srv/sites/backyard
docker exec -e MYSQL_PWD="$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)" mysql \
  mysqldump -ubackyard --no-tablespaces backyard > ~/backyard-$(date +%F).sql
```
