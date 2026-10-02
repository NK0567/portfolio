"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { text } from '@/lib/content';
import { PROJECT_STATUS_LABELS, type Project } from '@/types/api';

interface Props {
  projects: Project[];
  assetBase: string;
}

/**
 * Liste des projets.
 *
 * Chaque carte mène à sa page détaillée via le slug, pas via un identifiant
 * numérique en paramètre d'URL. Une adresse comme /projects/gestion-de-flotte
 * est lisible, partageable et indexable ; /single-project?id=16 ne l'est pas,
 * et Google ignore généralement ce genre de page.
 *
 * Le filtre porte sur les technologies et non sur une catégorie figée, parce
 * que c'est la vraie question d'un recruteur : qu'est-ce que cette personne a
 * déjà construit en Flutter, en NestJS, en React.
 */
export default function ProjectsSection({ projects, assetBase }: Props) {
  const [filter, setFilter] = useState<string>('');

  const technologies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects) {
      for (const skill of project.skills ?? []) {
        counts.set(skill.name, (counts.get(skill.name) ?? 0) + 1);
      }
    }
    // Seules les technologies présentes sur au moins deux projets servent de
    // filtre. En dessous, le filtre ne fait que masquer tout le reste.
    return [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  }, [projects]);

  const visible = filter
    ? projects.filter((p) => (p.skills ?? []).some((s) => s.name === filter))
    : projects;

  if (projects.length === 0) {
    return (
      <p className="text-haze">
        Aucun projet publié pour le moment. Ils arrivent depuis l&apos;administration.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {technologies.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('')}
            className={[
              'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors',
              filter === ''
                ? 'border-ink bg-ink text-paper'
                : 'border-rule text-haze hover:border-ink hover:text-ink',
            ].join(' ')}
          >
            tout ({projects.length})
          </button>

          {technologies.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setFilter(filter === name ? '' : name)}
              className={[
                'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors',
                filter === name
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule text-haze hover:border-ink hover:text-ink',
              ].join(' ')}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <ul className="grid gap-5 sm:grid-cols-2">
        {visible.map((project) => {
          const cover = project.mainImage?.startsWith('http')
            ? project.mainImage
            : `${assetBase}${project.mainImage ?? ''}`;

          return (
            <li key={project.id}>
              <Link
                href={`/projects/${project.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-sm border border-rule transition-colors hover:border-ink"
              >
                {project.mainImage && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={cover}
                    alt=""
                    loading="lazy"
                    className="aspect-[16/10] w-full border-b border-rule object-cover"
                  />
                )}

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-ink group-hover:text-signal">
                      {project.title}
                    </h3>
                    <span className="shrink-0 font-mono text-xs text-haze">
                      {new Date(project.date).getFullYear() || ''}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-haze">
                    {text(project.description)}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 pt-3">
                    {(project.skills ?? []).slice(0, 4).map((skill) => (
                      <span key={skill.id} className="font-mono text-xs text-haze">
                        {skill.name}
                      </span>
                    ))}
                    {(project.skills?.length ?? 0) > 4 && (
                      <span className="font-mono text-xs text-haze">
                        +{(project.skills?.length ?? 0) - 4}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 border-t border-rule pt-3 text-xs text-haze">
                    {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && (
        <p className="text-haze">
          Rien en {filter} pour l&apos;instant.{' '}
          <button type="button" onClick={() => setFilter('')} className="text-signal underline">
            Voir tous les projets
          </button>
        </p>
      )}
    </div>
  );
}
