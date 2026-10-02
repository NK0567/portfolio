import Link from 'next/link';

/** Lab introuvable, ou brouillon : la réponse est la même, volontairement. */
export default function LabNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-20 sm:px-8">
      <p className="font-mono text-sm text-signal">404</p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">Ce write-up n&apos;existe pas</h1>

      <p className="mt-4 max-w-[58ch] leading-relaxed text-haze">
        L&apos;adresse est peut-être mal recopiée, ou le write-up n&apos;est pas encore publié.
      </p>

      <Link
        href="/#labs"
        className="mt-8 inline-flex w-fit items-center rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
      >
        Voir les labs
      </Link>
    </main>
  );
}
