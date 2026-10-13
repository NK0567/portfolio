# Mettre le portfolio en ligne gratuitement

Quatre services gratuits, sans carte bancaire pour les trois premiers :

| Rôle | Service | Ce qu'il héberge |
|---|---|---|
| Site public et administration | **Vercel** (plan Hobby) | Le dossier `frontend` |
| API | **Render** (plan Free) | Le dossier `backend`, via son Dockerfile |
| Base de données MySQL | **TiDB Cloud Serverless** (gratuit), ou **Aiven for MySQL** (plan Free) | Les données et les images |
| Réveil | **UptimeRobot** (gratuit) | Rien : il appelle l'API toutes les 5 minutes |

Adresse finale : `https://<ton-nom>.vercel.app`. Un nom de domaine à toi (environ 10 € par an) pourra s'y brancher plus tard, sans rien changer d'autre.

> Les offres gratuites évoluent. Vérifie les conditions du moment sur le site de chaque service avant de commencer.

## Ce qui a été préparé dans le code

- **Images en base de données.** Render efface son disque à chaque redémarrage : les images envoyées depuis l'administration auraient disparu. Elles sont maintenant stockées dans MySQL, et leur adresse `/uploads/...` ne change pas.
- **Relais `/backend`.** Le site et l'API sont sur deux domaines différents. Le navigateur passe par le site (`/backend/api/...`), que Vercel relaie vers Render. Sans ce relais, Safari bloquerait le cookie de connexion de l'administration.
- **`/health` interroge la base.** Appelé régulièrement, il empêche l'API de s'endormir et garde la base active.
- **`render.yaml`** décrit l'API pour Render, secrets JWT générés automatiquement.

## 1. Pousser le code sur GitHub

Le dépôt peut être public (c'est même un atout sur un CV) : aucun secret n'y figure, les `.env` sont ignorés par Git.

```bash
git remote add origin https://github.com/<ton-compte>/portfolio.git
git push -u origin refactor/structure
```

Fusionne ensuite dans `main` : Vercel et Render déploient la branche principale.

## 2. Créer la base de données

### Option A : TiDB Cloud Serverless (recommandée)

Compatible MySQL, plusieurs Go gratuits, se réveille seule.

1. Crée un compte sur tidbcloud.com, puis un cluster **Serverless** (région la plus proche : Francfort ou Paris).
2. *Connect* > choisis **Prisma** dans la liste : l'outil affiche la chaîne de connexion.
3. Crée une base `portfolio` (onglet *SQL Editor* : `CREATE DATABASE portfolio;`).
4. Garde la chaîne, de la forme :
   `mysql://<user>:<motdepasse>@<hôte>:4000/portfolio?sslaccept=strict`

### Option B : Aiven for MySQL

1. Compte sur aiven.io, service **MySQL**, plan **Free**.
2. Copie la *Service URI* et ajoute le paramètre SSL :
   `mysql://avnadmin:<motdepasse>@<hôte>:<port>/defaultdb?sslaccept=accept_invalid_certs`
   (Aiven signe ses certificats avec sa propre autorité : la connexion reste chiffrée.)

Dans les deux cas, un caractère spécial du mot de passe s'encode : `@` → `%40`, `#` → `%23`, `:` → `%3A`.

### Copier tes données actuelles (facultatif)

Pour retrouver en ligne ce que tu as déjà saisi en local, exporte puis importe la base :

```bash
mysqldump -u root -p --no-create-info --skip-triggers --ignore-table=portfolio_db._prisma_migrations portfolio_db > donnees.sql
```

Crée d'abord les tables en ligne (étape 3 : Render le fait au premier démarrage), puis importe `donnees.sql` dans la base en ligne avec MySQL Workbench ou l'éditeur SQL du service. Avant l'export, lance `npm run uploads:import` dans `backend` pour copier en base les images restées sur le disque.

## 3. Déployer l'API sur Render

1. Compte sur render.com avec ton GitHub.
2. *New* > *Blueprint* > choisis le dépôt. Render lit `render.yaml` et prépare `portfolio-api`.
3. Renseigne les variables demandées :
   - `DATABASE_URL` : la chaîne de l'étape 2
   - `CORS_ORIGIN` : `https://<ton-nom>.vercel.app` (adresse connue à l'étape 4, modifiable ensuite)
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD` : ton compte admin (mot de passe de 12 caractères minimum)
4. Lance le déploiement. Au démarrage, l'API applique les migrations : les tables se créent seules.
5. Crée le compte admin, une seule fois : onglet *Shell* du service, puis `npm run db:seed`.
   (Si le Shell n'est pas disponible sur l'offre gratuite, lance le seed depuis ton ordinateur en mettant temporairement l'URL de la base en ligne dans `backend/.env`.)
6. Vérifie : `https://portfolio-api.onrender.com/health` doit répondre `"database":"OK"`.

## 4. Déployer le site sur Vercel

1. Compte sur vercel.com avec ton GitHub. *Add New* > *Project* > le dépôt.
2. **Root Directory** : `frontend`.
3. Variables d'environnement :

   | Nom | Valeur |
   |---|---|
   | `BACKEND_ORIGIN` | `https://portfolio-api.onrender.com` |
   | `NEXT_PUBLIC_API_URL` | `/backend/api` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<ton-nom>.vercel.app` |

4. *Deploy*. Reviens ensuite sur Render mettre la bonne adresse dans `CORS_ORIGIN` si elle a changé.

## 5. Empêcher l'API de s'endormir

Sur le plan gratuit, Render endort l'API après 15 minutes sans visite, et le réveil prend près d'une minute. Le site lui-même reste rapide (Vercel garde les pages en cache), mais l'administration et le formulaire de contact attendraient.

1. Compte sur uptimerobot.com, *Add New Monitor*.
2. Type **HTTP(s)**, URL `https://portfolio-api.onrender.com/health`, intervalle **5 minutes**.

Bonus : UptimeRobot t'envoie un e-mail si le site tombe.

Le dépôt contient aussi `.github/workflows/keep-alive.yml`, qui fait la même chose depuis GitHub. Pour l'activer : *Settings* > *Secrets and variables* > *Actions* > *Variables* > `API_HEALTH_URL` = l'adresse `/health` ci-dessus.

Un service gratuit Render dispose de 750 heures par mois : assez pour un service allumé en permanence.

## 6. Vérifications finales

- [ ] La page d'accueil affiche tes projets et tes compétences
- [ ] `/admin` : la connexion fonctionne, y compris dans Safari
- [ ] Une image envoyée depuis l'administration s'affiche, et toujours après un redéploiement Render
- [ ] Le formulaire de contact arrive dans l'écran Messages
- [ ] Le CV se télécharge
- [ ] Un partage du lien sur LinkedIn ou WhatsApp affiche le titre et l'image (écran Site > image de partage)

## Ensuite

- **Nom de domaine** : achète-le chez n'importe quel registraire, puis ajoute-le dans Vercel (*Settings* > *Domains*). Mets à jour `NEXT_PUBLIC_SITE_URL` et `CORS_ORIGIN`.
- **Sauvegardes** : exporte la base de temps en temps (`mysqldump`). Les offres gratuites n'en promettent aucune.
