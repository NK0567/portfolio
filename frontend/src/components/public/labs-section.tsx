import Link from 'next/link';
import { text, monthYear } from '@/lib/content';
import {
  LAB_DIFFICULTY_LABELS,
  LAB_PLATFORM_LABELS,
  type CyberLab,
} from '@/types/api';

interface Props {
  labs: CyberLab[];
}

/**
 * Labs de sécurité publiés.
 *
 * Composant serveur : aucune interaction, donc aucun JavaScript envoyé au
 * navigateur. Une liste plutôt que des cartes à image : un lab n'a pas de
 * capture d'écran qui parle, ce qui compte c'est la faille et la méthode,
 * et une liste dense se lit plus vite qu'une grille de vignettes.
 */
export default function LabsSection({ labs }: Props) {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {labs.map((lab) => (
        <li key={lab.id}>
          <Link
            href={`/labs/${lab.slug}`}
            className="group grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_200px] sm:gap-8"
          >
            <div className="min-w-0">
              <h3 className="font-semibold text-ink group-hover:text-signal">{lab.title}</h3>
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-haze">
                {text(lab.summary)}
              </p>
              {lab.techniques.length > 0 && (
                <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                  {lab.techniques.slice(0, 4).map((technique) => (
                    <span key={technique} className="font-mono text-xs text-graphite">
                      {technique}
                    </span>
                  ))}
                </p>
              )}
            </div>

            <dl className="flex gap-6 text-sm sm:flex-col sm:gap-1 sm:text-right">
              <div>
                <dt className="sr-only">Plateforme</dt>
                <dd className="text-graphite">{LAB_PLATFORM_LABELS[lab.platform] ?? lab.platform}</dd>
              </div>
              <div>
                <dt className="sr-only">Difficulté</dt>
                <dd className="font-mono text-xs text-haze">
                  {LAB_DIFFICULTY_LABELS[lab.difficulty] ?? lab.difficulty}
                  {lab.category ? ` · ${lab.category}` : ''}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Résolu</dt>
                <dd className="font-mono text-xs text-haze">{monthYear(lab.completedAt)}</dd>
              </div>
            </dl>
          </Link>
        </li>
      ))}
    </ul>
  );
}
