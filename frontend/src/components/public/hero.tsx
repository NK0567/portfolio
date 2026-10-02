import { assetUrl } from '@/lib/server-api';
import { text, list } from '@/lib/content';
import type { GlobalConfig, Profile } from '@/types/api';

interface Props {
  profile: Profile | null;
  config: GlobalConfig | null;
  counts: { projects: number; skills: number; years: number };
}

/**
 * Ouverture de la page.
 *
 * Pas de sphère 3D, pas de dégradé, pas de particules. Trois raisons : c'est
 * le visuel qu'on trouve sur un portfolio de développeur sur deux, ça coûte
 * 600 Ko de JavaScript avant le premier mot lisible, et ça ne dit rien de ce
 * que la personne sait faire.
 *
 * Ce qui porte la page, c'est le nom composé en grand, la phrase qui dit
 * exactement le métier, et trois chiffres vérifiables tirés de la base. Le
 * reste du site est la démonstration.
 */
export default function Hero({ profile, config, counts }: Props) {
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : 'Portfolio';
  const headline = text(profile?.headline) || list(profile?.titles)[0] || 'Développeur full stack';
  const bio = text(profile?.bio);
  const avatar = assetUrl(profile?.avatarUrl);
  const available = config?.isAvailable ?? false;

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-14">
          <div className="min-w-0 flex-1">
            {available && (
              <p className="rise rise-1 mb-6 inline-flex items-center gap-2 text-sm text-signal">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
                </span>
                {config?.freelanceStatus || 'Disponible pour un poste ou une mission'}
              </p>
            )}

            <h1 className="rise rise-2 text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              {fullName}
            </h1>

            <p className="rise rise-3 mt-4 max-w-[46ch] text-lg leading-relaxed text-graphite sm:text-xl">
              {headline}
            </p>

            {bio && (
              <p className="rise rise-4 mt-6 max-w-[62ch] leading-relaxed text-haze">{bio}</p>
            )}

            <dl className="rise rise-4 mt-10 flex flex-wrap gap-x-10 gap-y-5">
              <div>
                <dt className="font-mono text-2xl text-ink">{counts.projects}</dt>
                <dd className="mt-0.5 text-sm text-haze">
                  {counts.projects > 1 ? 'projets documentés' : 'projet documenté'}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-2xl text-ink">{counts.skills}</dt>
                <dd className="mt-0.5 text-sm text-haze">technologies maîtrisées</dd>
              </div>
              {counts.years > 0 && (
                <div>
                  <dt className="font-mono text-2xl text-ink">{counts.years}</dt>
                  <dd className="mt-0.5 text-sm text-haze">
                    {counts.years > 1 ? "années d'expérience" : "année d'expérience"}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {avatar && (
            <div className="rise rise-3 shrink-0">
              {/*
                * Balise img simple plutôt que next/image : les photos sont
                * servies par le backend, sur un autre domaine, et next/image
                * refuse un domaine absent de next.config.ts. Un portrait qui
                * ne s'affiche pas sur le portfolio parce qu'une variable
                * d'environnement manque en production coûte plus cher que
                * l'optimisation gagnée.
                */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                alt={fullName}
                width={176}
                height={176}
                loading="eager"
                className="h-36 w-36 rounded-sm border border-rule object-cover sm:h-44 sm:w-44"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
