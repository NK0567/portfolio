import { ArrowUp } from 'lucide-react';
import type { GlobalConfig } from '@/types/api';

interface Props {
  name: string;
  config: GlobalConfig | null;
}

export const SOCIAL_LABELS: Record<string, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  twitter: 'X',
  x: 'X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  dribbble: 'Dribbble',
  behance: 'Behance',
  email: 'E-mail',
};

/** Liens renseignés dans l'écran Site, sans les entrées vides. */
export const socialLinks = (config: GlobalConfig | null) =>
  Object.entries(config?.socialLinks ?? {}).filter(
    ([, url]) => typeof url === 'string' && url.trim().length > 0
  );

/** Une adresse e-mail saisie seule devient un lien mailto. */
export const socialHref = (key: string, url: string) =>
  key === 'email' && !url.startsWith('mailto:') ? `mailto:${url}` : url;

export default function SiteFooter({ name, config }: Props) {
  const links = socialLinks(config);

  return (
    <footer className="relative mt-10">
      <div className="h-px bg-gradient-to-r from-transparent via-signal/50 to-transparent" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="font-display text-sm font-semibold text-ink">{name}</p>
          <p className="mt-1 text-xs text-haze">
            © {new Date().getFullYear()} · Conçu et développé de bout en bout : Next.js, Three.js,
            Express, Prisma.
          </p>
        </div>

        <div className="flex items-center gap-5">
          {links.length > 0 && (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {links.map(([key, url]) => (
                <li key={key}>
                  <a
                    href={socialHref(key, url)}
                    target={key === 'email' ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className="text-sm text-haze transition-colors hover:text-cyan"
                  >
                    {SOCIAL_LABELS[key.toLowerCase()] ?? key}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <a
            href="#top"
            aria-label="Revenir en haut"
            className="neon-ring flex h-9 w-9 items-center justify-center rounded-full text-ink transition-transform hover:-translate-y-0.5"
          >
            <ArrowUp className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
