import { text, list, period } from '@/lib/content';
import type { Education, Experience } from '@/types/api';

interface Props {
  experiences: Experience[];
  education: Education[];
}

/**
 * Parcours professionnel et formation, dans une seule frise.
 *
 * Deux sections séparées obligent le lecteur à reconstruire mentalement la
 * chronologie. Une seule frise, triée par date, montre d'un coup d'œil ce qui
 * s'est passé en parallèle : un diplôme préparé pendant un emploi, par
 * exemple, se lit immédiatement.
 *
 * C'est l'un des rares endroits où un marqueur numéroté serait tentant. Il ne
 * serait pas juste : ce n'est pas une procédure en étapes, c'est une suite de
 * dates. Les dates font donc elles-mêmes le repère.
 */

type Entry = {
  id: string;
  kind: 'experience' | 'education';
  title: string;
  place: string;
  period: string;
  sortKey: number;
  description: string;
  bullets: string[];
};

export default function TimelineSection({ experiences, education }: Props) {
  const entries: Entry[] = [
    ...experiences.map((exp) => ({
      id: exp.id,
      kind: 'experience' as const,
      title: text(exp.role),
      place: [exp.company, exp.location].filter(Boolean).join(', '),
      period: period(exp.startDate, exp.endDate, exp.isCurrent),
      sortKey: new Date(exp.startDate).getTime(),
      description: text(exp.description),
      bullets: list(exp.achievements),
    })),
    ...education.map((edu) => ({
      id: edu.id,
      kind: 'education' as const,
      title: text(edu.degree),
      place: [edu.school, edu.location].filter(Boolean).join(', '),
      period: period(edu.startDate, edu.endDate, edu.isCurrent),
      sortKey: new Date(edu.startDate).getTime(),
      description: text(edu.description),
      bullets: [],
    })),
  ].sort((a, b) => b.sortKey - a.sortKey);

  if (entries.length === 0) {
    return <p className="text-haze">Parcours à renseigner depuis l&apos;administration.</p>;
  }

  return (
    <ol className="relative space-y-10 border-l border-rule pl-6 sm:pl-8">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.id}`} className="relative">
          <span
            aria-hidden
            className={[
              'absolute -left-[1.68rem] top-2 h-2.5 w-2.5 rounded-full border-2 sm:-left-[2.18rem]',
              entry.kind === 'experience'
                ? 'border-signal bg-signal'
                : 'border-haze bg-paper',
            ].join(' ')}
          />

          <p className="font-mono text-xs text-haze">{entry.period}</p>

          <h3 className="mt-1 font-semibold text-ink">{entry.title}</h3>
          <p className="text-sm text-graphite">{entry.place}</p>

          {entry.description && (
            <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-haze">
              {entry.description}
            </p>
          )}

          {entry.bullets.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {entry.bullets.map((bullet, index) => (
                <li key={index} className="flex max-w-[62ch] gap-2">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-signal" />
                  <span className="text-sm leading-relaxed text-haze">{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
