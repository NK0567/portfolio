# Portfolio full stack et administration

Site personnel rendu côté serveur, piloté par un back-office : projets, compétences, parcours, labs de sécurité avec write-ups, CV et lettres de motivation générés en PDF.

## Stack

- **Frontend :** Next.js 16 (App Router, rendu serveur), React 19, Tailwind CSS v4.
- **Backend :** Node.js, Express 5, Prisma 6, MySQL 8, validation Zod.
- **Sécurité :** JWT d'accès en mémoire et refresh token en cookie httpOnly avec rotation, RBAC, Helmet, CORS, limitation de débit, journal d'audit.

## Développement local

Prérequis : Node.js 20 ou plus, MySQL 8.

```bash
# Backend
cd backend
npm install
cp .env.example .env          # renseigner DATABASE_URL, les deux secrets JWT et le compte admin
npx prisma migrate deploy     # crée les tables
npm run db:seed               # crée le compte administrateur défini dans .env
npm run dev                   # http://localhost:8080

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev                   # http://localhost:3000, administration sur /admin
```

Après une modification de `prisma/schema.prisma` : `npm run db:migrate` (crée la migration et l'applique).

## Contenu

| Écran d'administration | Effet sur le site public |
|---|---|
| Projets | Section Projets et page `/projects/<slug>` |
| Labs sécurité | Section Labs et write-up `/labs/<slug>`. Un brouillon reste invisible et son adresse renvoie 404. La section n'apparaît qu'à partir du premier lab publié. |
| Compétences, Expériences, Formation | Sections correspondantes et CV généré |
| Site | Titre et description pour Google, image de partage, couleurs, liens du pied de page, badge de disponibilité |
| Paramètres | Profil, coordonnées, données du CV |
| Messages | Messages reçus par le formulaire de contact |

Le site public garde ses pages en cache : une modification met jusqu'à une minute à apparaître sur l'accueil, cinq minutes sur une page projet ou lab.

## Mise en production

Le dépôt contient tout ce qu'il faut pour un serveur unique (VPS) avec Docker :

```bash
cp .env.example .env              # domaines, mots de passe, secrets JWT, compte admin
docker compose up -d --build
docker compose exec api npm run db:seed   # une seule fois
```

- Les migrations s'appliquent automatiquement à chaque démarrage de l'API.
- La base et les fichiers envoyés vivent dans des volumes Docker : ils survivent aux redéploiements. Pense à les sauvegarder.
- Les conteneurs n'écoutent que sur `127.0.0.1`. Place devant un reverse proxy HTTPS (Caddy est le plus simple) qui sert `https://<domaine>` vers le port 3000 et `https://api.<domaine>` vers le port 8080. Le HTTPS est obligatoire : le cookie de session est marqué `secure` en production.
- `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_SITE_URL` sont gravées au build du frontend. Les changer impose `docker compose up -d --build web`.

Pour un hébergement séparé (frontend sur Vercel, API et base ailleurs), les deux `Dockerfile` restent utilisables isolément, et les variables à fournir sont listées dans `backend/.env.example` et `frontend/.env.example`.
