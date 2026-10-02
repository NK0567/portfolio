import type { GlobalConfig } from '@/types/api';

interface Props {
  name: string;
  config: GlobalConfig | null;
}

/** Libellés des réseaux. Une clé inconnue s'affiche telle quelle plutôt que d'être ignorée. */
const LABELS: Record<string, string> = {
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
};

export default function SiteFooter({ name, config }: Props) {
  const links = Object.entries(config?.socialLinks ?? {}).filter(
    ([, url]) => typeof url === 'string' && url.trim().length > 0
  );

  return (
    <footer className="bg-paper">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-sm text-haze">
          {name}, {new Date().getFullYear()}
        </p>

        {links.length > 0 && (
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map(([key, url]) => (
              <li key={key}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-haze transition-colors hover:text-signal"
                >
                  {LABELS[key.toLowerCase()] ?? key}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  );
}
