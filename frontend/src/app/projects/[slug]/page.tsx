import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { GithubIcon } from '@/components/icons/brand-icons';

import { getPublic, assetUrl } from '@/lib/server-api';
import { text, list, monthYear } from '@/lib/content';
import SiteHeader from '@/components/public/site-header';
import SiteFooter from '@/components/public/site-footer';
import {
  PROJECT_STATUS_LABELS,
  type CyberLab,
  type GlobalConfig,
  type Profile,
  type Project,
} from '@/types/api';

/**
 * Page détaillée d'un projet.
 *
 * C'est la pièce qui manquait, et c'est elle qui fait la différence avec un
 * portfolio qui se contente de vignettes. Le visiteur y trouve ce qu'aucune
 * capture d'écran ne montre : comment c'est construit, ce qui a résisté, ce
 * que ça a donné. Les champs existaient déjà en base, personne ne les lisait.
 *
 * L'adresse utilise le slug, donc une URL lisible et indexable, et non un
 * identifiant passé en paramètre de requête.
 */

export const revalidate = 300;

interface PageProps {
  // Depuis Next 15, params est une promesse et doit être attendue.
  params: Promise<{ slug: string }>;
}

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const project = await getPublic<Project>(`/projects/${slug}`);

  if (!project) return { title: 'Projet introuvable' };

  const description = text(project.description).slice(0, 160);
  const image = assetUrl(project.mainImage);

  return {
    title: project.title,
    description,
    openGraph: {
      title: project.title,
      description,
      type: 'article',
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
};

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;

  const [project, profile, config, labs] = await Promise.all([
    getPublic<Project>(`/projects/${slug}`),
    getPublic<Profile>('/profile'),
    getPublic<GlobalConfig>('/config'),
    getPublic<CyberLab[]>('/labs'),
  ]);

  /*
   * Attention à la nuance : getPublic renvoie null aussi bien pour un projet
   * inexistant que pour une API injoignable. Dans les deux cas, afficher la
   * page 404 est le comportement le moins trompeur : mieux vaut « page
   * introuvable » qu'une fiche à moitié vide qui laisse croire que le projet
   * est mal renseigné.
   */
  if (!project) notFound();

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : 'Portfolio';
  const content = text(project.content);
  const challenges = text(project.challenges);
  const features = list(project.features);
  const cover = assetUrl(project.mainImage);
  const gallery = (project.images ?? [])
    .map((image) => assetUrl(image))
    .filter((url): url is string => url !== null);

  /*
   * L'architecture est un champ JSON libre : rien ne garantit que les valeurs
   * soient des chaînes. On ne garde que ce qui s'affiche proprement, plutôt
   * que de laisser « [object Object] » sur une page publique.
   */
  const architecture = Object.entries(project.architecture ?? {})
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
    .map(([key, value]) => [key, String(value)] as const);

  return (
    <>
      <SiteHeader name={fullName} showLabs={(labs?.length ?? 0) > 0} />

      <main>
        <article>
          <header className="border-b border-rule">
            <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
              <Link
                href="/#projets"
                className="inline-flex items-center gap-2 text-sm text-haze transition-colors hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" />
                Tous les projets
              </Link>

              <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink sm:text-5xl">
                {project.title}
              </h1>

              <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-graphite">
                {text(project.description)}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                <div>
                  <p className="text-xs text-haze">Statut</p>
                  <p className="font-mono text-sm text-ink">
                    {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-haze">Date</p>
                  <p className="font-mono text-sm text-ink">{monthYear(project.date)}</p>
                </div>

                <div className="flex flex-wrap gap-3 sm:ml-auto">
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Voir en ligne
                    </a>
                  )}
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-sm border border-rule px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink"
                    >
                      <GithubIcon className="h-4 w-4" />
                      Code source
                    </a>
                  )}
                </div>
              </div>
            </div>
          </header>

          {cover && (
            <div className="border-b border-rule">
              <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover}
                  alt={project.title}
                  className="w-full rounded-sm border border-rule object-cover"
                />
              </div>
            </div>
          )}

          <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
            <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_230px]">
              <div className="min-w-0 space-y-12">
                {content && (
                  <section>
                    <h2 className="text-xl font-semibold text-ink">Le projet</h2>
                    <div className="mt-4 max-w-[68ch] space-y-4 leading-relaxed text-graphite">
                      {content.split(/\n{2,}/).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                )}

                {features.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-ink">Fonctionnalités</h2>
                    <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      {features.map((feature, index) => (
                        <li key={index} className="flex gap-2.5">
                          <span
                            aria-hidden
                            className="mt-2 h-1 w-1 shrink-0 rounded-full bg-signal"
                          />
                          <span className="text-sm leading-relaxed text-graphite">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {challenges && (
                  <section>
                    <h2 className="text-xl font-semibold text-ink">Difficultés et solutions</h2>
                    <div className="mt-4 max-w-[68ch] space-y-4 leading-relaxed text-graphite">
                      {challenges.split(/\n{2,}/).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                )}

                {architecture.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-ink">Architecture</h2>
                    <dl className="mt-4 divide-y divide-rule border-y border-rule">
                      {architecture.map(([key, value]) => (
                        <div
                          key={key}
                          className="grid gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4"
                        >
                          <dt className="text-sm font-medium text-ink">{key}</dt>
                          <dd className="font-mono text-sm text-graphite">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}

                {gallery.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-ink">Captures</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {gallery.map((image, index) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={image}
                          src={image}
                          alt={`${project.title}, capture ${index + 1}`}
                          loading="lazy"
                          className="w-full rounded-sm border border-rule object-cover"
                        />
                      ))}
                    </div>
                  </section>
                )}

                {project.videoUrl && (
                  <section>
                    <h2 className="text-xl font-semibold text-ink">Démonstration</h2>
                    <a
                      href={project.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm text-signal hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Voir la vidéo
                    </a>
                  </section>
                )}
              </div>

              <aside className="space-y-8 lg:border-l lg:border-rule lg:pl-8">
                {(project.skills?.length ?? 0) > 0 && (
                  <div>
                    <h2 className="font-semibold text-ink">Technologies</h2>
                    <ul className="mt-3 space-y-1.5">
                      {project.skills.map((skill) => (
                        <li key={skill.id} className="font-mono text-sm text-graphite">
                          {skill.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {project.documentation && (
                  <div>
                    <h2 className="font-semibold text-ink">Documentation</h2>
                    <p className="mt-2 text-sm leading-relaxed text-haze">
                      {project.documentation}
                    </p>
                  </div>
                )}

                <div>
                  <h2 className="font-semibold text-ink">Adresse</h2>
                  <p className="mt-2 break-all font-mono text-xs text-haze">/projects/{project.slug}</p>
                </div>
              </aside>
            </div>
          </div>
        </article>
      </main>

      <SiteFooter name={fullName} config={config} />
    </>
  );
}

/*
 * Pas de generateStaticParams volontairement.
 *
 * Pré-générer la liste des projets au build figerait les pages jusqu'au
 * déploiement suivant : un projet ajouté depuis l'administration
 * n'apparaîtrait pas. Avec le rendu à la demande et revalidate à 300, une
 * nouvelle page existe cinq minutes après sa création, sans redéployer.
 * C'est tout l'intérêt d'avoir un back-office.
 */

export const dynamicParams = true;