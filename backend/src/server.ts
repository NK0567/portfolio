// env.ts charge dotenv et valide la configuration : il doit être importé
// en tout premier, avant tout module qui lit process.env.
import { env } from './config/env';
import app from './app';
import prisma from './config/db';

const start = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('[db] Connexion à la base établie.');
  } catch (error) {
    console.error('[db] Connexion impossible :', error);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[server] http://localhost:${env.PORT}  (${env.NODE_ENV})`);
  });

  /*
   * Arrêt propre : on cesse d'accepter de nouvelles connexions, on laisse les
   * requêtes en cours se terminer, puis on ferme le pool Prisma. Sans cela,
   * un redéploiement coupe les requêtes en plein vol et laisse des
   * connexions MySQL ouvertes.
   */
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[server] ${signal} reçu, arrêt en cours...`);

    const forceExit = setTimeout(() => {
      console.error('[server] Arrêt forcé après 10 s.');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      await prisma.$disconnect();
      console.log('[server] Arrêt propre terminé.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Un rejet non capturé laisse le process dans un état incertain :
  // on le journalise et on laisse l'orchestrateur relancer un process sain.
  process.on('unhandledRejection', (reason) => {
    console.error('[server] Promesse rejetée non gérée :', reason);
  });
};

void start();
