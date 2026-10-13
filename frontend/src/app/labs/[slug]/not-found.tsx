import Link from 'next/link';

/** Lab introuvable, ou brouillon : la réponse est la même, volontairement. */
export default function LabNotFound() {
  return (
    <div className="public-site flex">
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-20 sm:px-8">
      <p className="font-mono text-sm text-cyan">404</p>

      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink">Ce write-up n&apos;existe pas</h1>

      <p className="mt-4 max-w-[58ch] leading-relaxed text-haze">
        L&apos;adresse est peut-être mal recopiée, ou le write-up n&apos;est pas encore publié.
      </p>

      <Link
        href="/#securite"
        className="mt-8 inline-flex w-fit items-center btn-primary"
      >
        Voir les labs
      </Link>
    </main>
    </div>
  );
}
