# Étape 3 — Backend durci

Remplace le contenu de ton dossier backend par celui de cette archive.
`node_modules/`, `.env` et `package-lock.json` ne sont **pas** inclus : garde les tiens.

## Installation

```bash
# 1. Remplacer les fichiers (garde ton .env !)
#    Les fichiers fournis écrasent src/, prisma/seed.ts, package.json, tsconfig.json

# 2. Nettoyer les dépendances retirées, installer zod
npm uninstall csurf bcrypt @types/bcrypt ts-node-dev
npm install

# 3. Supprimer l'auto-seed au démarrage (remplacé par npm run db:seed)
rm -f src/utils/bootstrap.ts

# 4. Vérifier
npm run typecheck
npm run dev
```

## À ajouter dans ton `.env`

Rien de nouveau si tu as suivi l'étape 2. Vérifie simplement que
`JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET` font au moins 32 caractères et
sont **différents** — le serveur refuse désormais de démarrer sinon.

## Ce qui a changé

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `src/config/env.ts` | Valide les variables d'environnement au démarrage |
| `src/types/express.d.ts` | Type `req.user` (fin des `(req as any)`) |
| `src/middlewares/validate.middleware.ts` | Validation Zod du body et de la query |
| `src/middlewares/rateLimit.middleware.ts` | 4 limiteurs (global, auth, écriture, contact) |
| `src/schemas/*.ts` | 7 fichiers de schémas Zod |
| `src/utils/slug.ts` | Slug stable et unique |
| `src/controllers/profile.controller.ts` | Profil (singleton) |
| `src/controllers/config.controller.ts` | Configuration globale (singleton) |
| `src/routes/profile.routes.ts`, `config.routes.ts` | Routes correspondantes |

### Fichier supprimé

`src/utils/bootstrap.ts` — il entrait en conflit avec `prisma/seed.ts` et
créait un second compte admin avec d'autres identifiants. C'était très
probablement la cause de tes blocages sur le login.

### Bugs corrigés

1. **Slug régénéré à chaque modification.** Un changement de titre cassait
   l'URL publique du projet, donc les liens partagés et l'indexation Google.
   Le slug est maintenant fixé à la création.

2. **Perte de données sur les mises à jour partielles.** `.partial()` ne
   supprime pas les `.default()` : un PUT ne contenant que le titre
   réinitialisait le statut, vidait les fonctionnalités et **effaçait toutes
   les compétences liées**. Les schémas de modification n'ont plus aucun défaut.

3. **`JSON.parse` avec `catch {}` silencieux.** Un JSON malformé était stocké
   tel quel en base. Il produit maintenant un 422 immédiat et explicite.

4. **Secrets JWT de repli codés en dur.** `'fallback_access_secret'` rendait
   tous les jetons forgeables par quiconque lisait le dépôt. Supprimés :
   `env.ts` garantit la présence des vrais secrets.

5. **`error.message` renvoyé au client.** Un message Prisma expose les noms de
   tables et de contraintes. Masqué derrière un 500 générique.

6. **`deleteMany` + `create` non transactionnel** sur les compétences d'un
   projet : un échec au milieu perdait les liaisons.

7. **`sameSite: 'strict'`** sur le cookie de refresh : il n'aurait jamais été
   envoyé en production (frontend et API sur des domaines différents).
   Désormais `lax` en dev, `none` + `secure` en prod.

### Améliorations de sécurité

- **Rotation du refresh token** : l'ancienne session est détruite à chaque
  renouvellement. Un jeton intercepté devient inutilisable.
- **Comparaison à temps constant au login** : le hachage est exécuté même si
  l'email n'existe pas, pour empêcher l'énumération des comptes au chronomètre.
- **bcrypt en 12 tours** au lieu de 10.
- **Noms de fichiers aléatoires** à l'upload (le nom d'origine peut contenir
  `../../` ou une double extension `.php.jpg`).
- **`trust proxy` à 1** et non `true` : `true` permettrait de contourner le
  rate limiting en forgeant un en-tête `X-Forwarded-For`.
- **Suppression des fichiers orphelins** quand une image est remplacée ou un
  projet supprimé.
- **Changement de mot de passe** révoque toutes les sessions ouvertes.

## Nouvelles routes

```
GET  /api/profile              public   — nom, bio, photo, CV, titres du hero
PUT  /api/profile              admin    — création ou mise à jour (upload avatar)
POST /api/profile/cv?lang=fr   admin    — remplacer le CV PDF

GET  /api/config               public   — couleurs, SEO, liens sociaux, ordre des sections
PUT  /api/config               admin    — mise à jour

POST /api/auth/change-password admin    — révoque toutes les sessions
GET  /api/audit?page=1&limit=20 superadmin — journal paginé
```

Filtres ajoutés : `GET /api/projects?status=COMPLETED&skill=<uuid>&search=paiement`
et `GET /api/skills?grouped=true`.

## Checklist de validation

```bash
# 1. Route inexistante -> 404 JSON, pas du HTML
curl -i http://localhost:8080/api/nawak

# 2. Validation -> 422 avec le champ fautif
curl -s -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" -d '{"title":"ab"}'
#    (401 sans token : c'est normal, teste après login)

# 3. Rate limit -> la 9e tentative renvoie 429
for i in $(seq 1 9); do
  curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" -d '{"email":"faux@test.com","password":"faux"}'
done; echo

# 4. Nouvelles routes publiques
curl -s http://localhost:8080/api/profile
curl -s http://localhost:8080/api/config

# 5. Le slug ne change plus après modification du titre
```

- [ ] `npm run typecheck` sans erreur
- [ ] Le serveur refuse de démarrer si un secret JWT est vide ou trop court
- [ ] `/api/nawak` renvoie un 404 JSON
- [ ] 9 tentatives de login ratées → 429
- [ ] `/api/profile` et `/api/config` répondent 200 après `npm run db:seed`
- [ ] Modifier le titre d'un projet ne change **plus** son slug
- [ ] Modifier le titre d'un projet ne supprime **plus** ses compétences

## Reste à faire (étape 7 : durcissement)

- Formulaire de contact (`ContactMessage`) + envoi d'email
- 2FA (le schéma Prisma est déjà prêt : `isTwoFactorEnabled`, `twoFactorSecret`)
- Purge automatique des sessions expirées (tâche planifiée)
- Pagination des projets si tu dépasses ~50 entrées
