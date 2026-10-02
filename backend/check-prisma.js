/**
 * Diagnostic du client Prisma, à placer à la racine du dossier backend
 * et à lancer avec :
 *
 *     node check-prisma.js
 *
 * Ce script ne passe ni par Express, ni par le serveur en cours d'exécution.
 * Il charge le client Prisma depuis zéro, dans un processus neuf. C'est
 * précisément ce qui le rend utile : si le modèle apparaît ici mais que
 * l'application continue d'échouer, c'est que le serveur qui répond aux
 * requêtes n'a pas été relancé.
 */

const path = require('path');

const main = async () => {
  console.log('\n=== Diagnostic Prisma ===\n');

  // 1. D'où vient le client réellement chargé ?
  let clientPath;
  try {
    clientPath = require.resolve('@prisma/client');
    console.log('Client chargé depuis :');
    console.log('  ' + clientPath + '\n');
  } catch {
    console.error('@prisma/client introuvable. Lance `npm install` dans ce dossier.\n');
    process.exitCode = 1;
    return;
  }

  // Un chemin qui ne part pas du dossier courant signale un node_modules
  // parent : la génération écrirait alors ailleurs que là où on la cherche.
  if (!clientPath.startsWith(path.resolve('.'))) {
    console.warn(
      'Attention : ce client ne vient pas du node_modules de ce dossier.\n' +
        'Tu lances probablement le script depuis le mauvais répertoire.\n'
    );
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  // 2. Quels modèles le client connaît-il ?
  const models = Object.keys(prisma)
    .filter((key) => !key.startsWith('_') && !key.startsWith('$'))
    .sort();

  console.log('Modèles connus du client (' + models.length + ') :');
  console.log('  ' + models.join(', ') + '\n');

  if (!models.includes('coverLetter')) {
    console.error('VERDICT : le modèle CoverLetter est ABSENT du client généré.\n');
    console.error('Donc le bloc `model CoverLetter { ... }` ne figure pas dans');
    console.error('prisma/schema.prisma, ou `npx prisma generate` a échoué.\n');
    console.error('Ouvre prisma/schema.prisma et cherche « model CoverLetter ».');
    console.error('S\'il y est, relance `npx prisma generate` et regarde la');
    console.error('sortie complète, sans la faire défiler trop vite.\n');
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  console.log('Le modèle CoverLetter est bien présent dans le client.\n');

  // 3. La table existe-t-elle vraiment en base ?
  try {
    const total = await prisma.coverLetter.count();
    console.log('VERDICT : tout est en place. ' + total + ' lettre(s) en base.\n');
    console.log('Si l\'application affiche encore l\'erreur, c\'est que le');
    console.log('serveur qui répond n\'a pas été relancé depuis la génération.');
    console.log('Vérifie l\'uptime sur http://127.0.0.1:8080/health, puis');
    console.log('cherche un processus Node resté sur le port 8080 :');
    console.log('  netstat -ano | findstr :8080\n');
  } catch (error) {
    const message = error && error.message ? error.message : String(error);

    if (message.includes('P2021') || message.toLowerCase().includes('does not exist')) {
      console.error('VERDICT : le client connaît le modèle, mais la TABLE');
      console.error('n\'existe pas en base.\n');
      console.error('Lance : npx prisma migrate dev --name add_cover_letter\n');
    } else if (message.includes('P1001')) {
      console.error('VERDICT : la base est injoignable.');
      console.error('Vérifie que MySQL tourne et que DATABASE_URL est correct.\n');
    } else {
      console.error('Erreur inattendue :\n' + message + '\n');
    }

    process.exitCode = 1;
  }

  await prisma.$disconnect();
};

main().catch((error) => {
  console.error('\nÉchec du diagnostic :', error && error.message ? error.message : error, '\n');
  process.exitCode = 1;
});