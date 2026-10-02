# Écran de configuration du site

Trois fichiers. Aucun changement côté backend : `GET /api/config` et
`PUT /api/config` existaient déjà, personne ne les appelait.

## Installation

```bash
# Ajouter :
#   src/services/config.service.ts
#   src/app/admin/site/page.tsx
# Remplacer :
#   src/app/layout.tsx

npx tsc --noEmit && npm run build
```

Puis l'entrée de menu, dans `src/components/ui/dashboard-sidebar.tsx`.
Ajouter `Globe` à l'import `lucide-react`, puis dans le tableau `navigation`,
juste avant Paramètres :

```ts
{ name: 'Site', href: '/admin/site', icon: Globe },
```

## Ce que ça débloque

Trois choses livrées la semaine dernière restaient vides faute de pouvoir les
renseigner.

Le badge de disponibilité du hero lit `isAvailable` et `freelanceStatus`.

Les liens du pied de page lisent `socialLinks`.

Le titre et la description qui apparaissent dans Google et dans les aperçus
de partage lisent `seoConfig`. L'image de partage est maintenant transmise à
Open Graph et à Twitter, ce qui n'était pas le cas.

## Les couleurs agissent réellement

C'est le point sur lequel j'ai hésité. Un formulaire de couleurs qui
enregistre en base sans rien changer à l'écran, c'est exactement le genre de
fonctionnalité à moitié construite qu'on essaie d'éliminer de ce projet.

Le layout lit donc `themeConfig` et injecte deux jetons, `--ink` et
`--signal`, qui écrasent ceux de `globals.css`. Changer la couleur d'accent
dans l'administration change la couleur des liens sur le site public.

Deux garde-fous.

Les valeurs sont revalidées contre `#rrggbb` avant d'être injectées dans la
balise `<style>`. Le serveur contrôle déjà ce format, mais une donnée modifiée
directement en base ne passerait pas par cette validation, et une chaîne
arbitraire casserait la feuille de style entière.

Seuls le texte et l'accent sont pilotés. Les fonds, les traits et les gris
restent fixes. Laisser modifier le fond ouvrirait la porte à des combinaisons
illisibles sans aucun contrôle de contraste.

## Cas prévus quand ça se passe mal

| Situation | Comportement |
|---|---|
| Configuration jamais enregistrée | Le contrôleur renvoie ses valeurs par défaut, l'écran s'ouvre rempli au lieu d'être vide. |
| `themeConfig` incomplet en base | Fusionné avec les valeurs par défaut à la lecture. Sans ça, lire `themeConfig.accentColor` sur un objet partiel planterait l'écran. |
| Couleur mal saisie | Message explicite avant l'envoi, avec le nom du champ. Le serveur refuserait de toute façon, autant éviter l'aller-retour. |
| Les deux langues décochées | Bloqué. Un site sans langue publiée n'a pas de sens. |
| Lien social incomplet | La ligne est ignorée à l'enregistrement, pas d'entrée fantôme dans le pied de page. |
| Casse incohérente sur un intitulé | Mis en minuscules, pour que « GitHub » et « github » ne fassent pas deux entrées. |
| API injoignable au build | Les métadonnées retombent sur les valeurs de repli, la palette sur les couleurs d'origine. La page reste affichable. |

## Deux limites assumées, et dites dans l'interface

L'ordre des sections est enregistré mais la page d'accueil garde un ordre
fixe. Le réglage est affiché avec cette précision écrite sous le champ, plutôt
que de laisser croire qu'il agit.

Les langues activées préparent le sélecteur de langue, elles ne le créent pas.
Le site public reste en français.

Ces deux points sont la suite logique si tu décides d'assumer le bilingue.

## Après l'enregistrement

Le site public met jusqu'à une minute à refléter un changement, le temps que
le cache de `revalidate` expire. Ce n'est pas un bug. Si tu veux voir tout de
suite, recharge avec Ctrl+Shift+R, ou passe `revalidate` à 0 dans
`server-api.ts` le temps de tes réglages.

## Reste à faire

Les labs de sécurité, qui activeraient `CyberLab` et constitueraient ton vrai
différenciateur.

La décision sur le bilingue : un vrai routing `[locale]`, ou on arrête de
payer la complexité `{ fr, en }` sur chaque champ.

L'hébergement, en gardant en tête que Vercel ne conserve pas les fichiers
écrits sur disque, donc que le backend a besoin d'un disque persistant
ailleurs.
