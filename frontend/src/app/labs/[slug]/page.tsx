import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import { getPublic, assetUrl } from '@/lib/server-api';
import { text, monthYear } from '@/lib/content';
import SiteHeader from '@/components/public/site-header';
import SiteFooter from '@/components/public/site-footer';
import WriteUp from '@/components/public/write-up';
import {
  LAB_DIFFICULTY_LABELS,
  LAB_PLATFORM_LABELS,
  type CyberLab,
  type GlobalConfig,
  type Profile,
} from '@/types/api';

/**
 * Write-up d'un lab de sécurité.
 *
 * Ce rendu serveur passe par la route publique sans jeton : un brouillon
 * renvoie donc 404 ici, même pour l'administrateur connecté. C'est voulu,
 * la page montre exactement ce que voit un visiteur.
 */

export const revalidate = 300;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const lab = await getPublic<CyberLab>(`/labs/${slug}`);

  if (!lab) return { title: 'Lab introuvable' };

  const title = `${lab.title} — write-up ${LAB_PLATFORM_LABELS[lab.platform] ?? lab.platform}`;
  const description = text(lab.summary).slice(0, 160);
  const image = assetUrl(lab.badgeUrl);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
};

export default async function LabPage({ params }: PageProps) {
  const { slug } = await params;

  const [lab, profile, config] = await Promise.all([
    getPublic<CyberLab>(`/labs/${slug}`),
    getPublic<Profile>('/profile'),
    getPublic<GlobalConfig>('/config'),
  ]);

  if (!lab) notFound();

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : 'Portfolio';
  const content = text(lab.content);
  const remediation = text(lab.remediation);
  const badge = assetUrl(lab.badgeUrl);
  const platform = LAB_PLATFORM_LABELS[lab.platform] ?? lab.platform;

  return (
    <>
      <SiteHeader name={fullName} showLabs />

      <main>
        <article>
          <header className="border-b border-rule">
            <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
              <Link
                href="/#labs"
                className="inline-flex items-center gap-2 text-sm text-haze transition-colors hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" />
                Tous les labs
              </Link>

              <div className="mt-6 flex items-start gap-5">
                {badge && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={badge}
                    alt=""
                    className="hidden h-16 w-16 shrink-0 rounded-sm border border-rule object-cover sm:block"
                  />
                )}
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-5xl">{lab.title}</h1>
                  <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-graphite">
                    {text(lab.summary)}
                  </p>
                </div>
              </div>

              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
                <div>
                  <dt className="text-xs text-haze">Plateforme</dt>
                  <dd className="font-mono text-sm text-ink">{platform}</dd>
                </div>
                <div>
                  <dt className="text-xs text-haze">Difficulté</dt>
                  <dd className="font-mono text-sm text-ink">
                    {LAB_DIFFICULTY_LABELS[lab.difficulty] ?? lab.difficulty}
                  </dd>
                </div>
                {lab.category && (
                  <div>
                    <dt className="text-xs text-haze">Catégorie</dt>
                    <dd className="font-mono text-sm text-ink">{lab.category}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-haze">Résolu</dt>
                  <dd className="font-mono text-sm text-ink">{monthYear(lab.completedAt)}</dd>
                </div>
              </dl>
            </div>
          </header>

          <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
            <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_230px]">
              <div className="min-w-0 space-y-12">
                {content && (
                  <section>
                    <h2 className="text-xl font-semibold text-ink">Write-up</h2>
                    <div className="mt-4">
                      <WriteUp source={content} />
                    </div>
                  </section>
                )}

                {remediation && (
                  <section className="border-l-2 border-signal pl-5">
                    <h2 className="text-xl font-semibold text-ink">Remédiation</h2>
                    <div className="mt-4">
                      <WriteUp source={remediation} />
                    </div>
                  </section>
                )}

                {/*
                 * Un write-up décrit l'exploitation d'une faille. Sans
                 * contexte, rien ne dit à un lecteur pressé que la cible
                 * était légitime : une ligne lève l'ambiguïté.
                 */}
                <p className="max-w-[68ch] border-t border-rule pt-6 text-xs leading-relaxed text-haze">
                  {lab.platform === 'Custom'
                    ? 'Exercice réalisé sur un environnement de test personnel, isolé et construit à cet effet.'
                    : `Exercice réalisé sur une machine volontairement vulnérable fournie par ${platform}, dans le cadre prévu par la plateforme.`}{' '}
                  Ces techniques ne doivent être employées que sur des systèmes pour lesquels on dispose
                  d&apos;une autorisation écrite.
                </p>
              </div>

              <aside className="space-y-8 lg:border-l lg:border-rule lg:pl-8">
                {lab.techniques.length > 0 && (
                  <div>
                    <h2 className="font-semibold text-ink">Techniques</h2>
                    <ul className="mt-3 space-y-1.5">
                      {lab.techniques.map((technique) => (
                        <li key={technique} className="text-sm text-graphite">{technique}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {lab.tools.length > 0 && (
                  <div>
                    <h2 className="font-semibold text-ink">Outils</h2>
                    <ul className="mt-3 space-y-1.5">
                      {lab.tools.map((tool) => (
                        <li key={tool} className="font-mono text-sm text-graphite">{tool}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {lab.writeUpUrl && (
                  <div>
                    <h2 className="font-semibold text-ink">Complément</h2>
                    <a
                      href={lab.writeUpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm text-signal hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Scripts et notes
                    </a>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </article>
      </main>

      <SiteFooter name={fullName} config={config} />
    </>
  );
}
