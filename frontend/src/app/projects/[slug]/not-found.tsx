import Link from 'next/link';

/**
 * Projet introuvable.
 *
 * Une page vide n'est pas une impasse mais une invitation : on dit ce qui
 * s'est passé, puis on redonne un chemin. Trois causes possibles, un seul
 * bouton utile.
 */
export default function ProjectNotFound() {
  return (
    <div className="public-site flex">
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-20 sm:px-8">
      <p className="font-mono text-sm text-cyan">404</p>

      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink">Ce projet n&apos;existe pas</h1>

      <p className="mt-4 max-w-[58ch] leading-relaxed text-haze">
        L&apos;adresse est peut-être mal recopiée, ou le projet a été retiré. Il se peut aussi que le
        serveur de données soit momentanément arrêté, auquel cas il reviendra de lui-même.
      </p>

      <Link
        href="/#projets"
        className="mt-8 inline-flex w-fit items-center btn-primary"
      >
        Voir tous les projets
      </Link>
    </main>
    </div>
  );
}
