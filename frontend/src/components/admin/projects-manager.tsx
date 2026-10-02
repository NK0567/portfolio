"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { GithubIcon } from '@/components/icons/brand-icons';

import { projectService } from '@/services/project.service';
import { mediaUrl } from '@/lib/assets';
import { getErrorMessage } from '@/lib/api';
import { PROJECT_STATUS_LABELS, type Project } from '@/types/api';
import ProjectFormModal from './project-form-modal';
import DeleteProjectModal from '../modals/delete-project-modal';

/**
 * Liste administrable des projets.
 *
 * Deux corrections par rapport à la version précédente.
 *
 * Les images utilisaient `project.mainImage` tel quel, soit « /uploads/x.jpg ».
 * Dans une balise img servie par Next, ce chemin est résolu contre
 * localhost:3000, où rien ne répond. Les vignettes ne s'affichaient donc
 * jamais, et le `onError` qui masquait la balise rendait le bug invisible.
 * Tout passe maintenant par mediaUrl.
 *
 * L'extraction de la réponse testait trois formes possibles avec des `any`
 * en cascade. Le service renvoie déjà un tableau typé, il n'y a rien à
 * déballer.
 */

/**
 * Complétude d'un projet.
 *
 * La page publique a cinq blocs : récit, fonctionnalités, difficultés,
 * architecture, galerie. Un projet qui n'en remplit aucun s'affiche comme une
 * vignette avec un titre. Cet indicateur dit lesquels manquent, pour que le
 * travail de remplissage se voie au lieu de se découvrir en visitant le site.
 */
const completeness = (project: Project) => {
  const checks = [
    { label: 'récit', done: Boolean(project.content?.fr?.trim()) },
    { label: 'fonctionnalités', done: (project.features?.fr?.length ?? 0) > 0 },
    { label: 'difficultés', done: Boolean(project.challenges?.fr?.trim()) },
    { label: 'architecture', done: Object.keys(project.architecture ?? {}).length > 0 },
    { label: 'galerie', done: (project.images?.length ?? 0) > 0 },
  ];

  return {
    done: checks.filter((c) => c.done).length,
    total: checks.length,
    missing: checks.filter((c) => !c.done).map((c) => c.label),
  };
};

export default function ProjectsManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await projectService.getAll());
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger les projets.'));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setFormOpen(true);
  };

  /**
   * Suppression optimiste : la carte disparaît avant la réponse du serveur,
   * et revient si l'appel échoue. La liste reste donc le reflet de la base,
   * jamais un état intermédiaire inventé par l'interface.
   */
  const confirmDelete = async () => {
    if (!toDelete) return;

    const previous = projects;
    setProjects((list) => list.filter((p) => p.id !== toDelete.id));
    setDeleting(true);

    try {
      await projectService.delete(toDelete.id);
      setToDelete(null);
    } catch (err) {
      setProjects(previous);
      setError(getErrorMessage(err, 'Suppression impossible. La liste a été rétablie.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {projects.length} projet{projects.length > 1 ? 's' : ''} publié
            {projects.length > 1 ? 's' : ''}
          </p>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Nouveau projet
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
            <p className="font-medium text-slate-600 dark:text-slate-300">Aucun projet.</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
              Trois projets documentés en profondeur valent mieux que quinze lignes de résumé.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Créer le premier
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => {
              const cover = mediaUrl(project.mainImage);
              const score = completeness(project);

              return (
                <article
                  key={project.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                >
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cover}
                      alt=""
                      className="h-40 w-full border-b border-slate-100 object-cover dark:border-slate-800"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center gap-2 border-b border-slate-100 bg-slate-50 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                      <ImageIcon className="h-4 w-4" />
                      Aucun visuel
                    </div>
                  )}

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-900 dark:text-slate-100">
                          {project.title}
                        </h3>
                        <p className="truncate font-mono text-xs text-slate-400">
                          /projects/{project.slug}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(project)}
                          title="Modifier"
                          className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(project)}
                          title="Supprimer"
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {project.description?.fr || project.description?.en || 'Pas de description'}
                    </p>

                    {(project.skills?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {project.skills.slice(0, 5).map((skill) => (
                          <span
                            key={skill.id}
                            className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className={[
                              'h-full rounded-full transition-all',
                              score.done === score.total ? 'bg-emerald-500' : 'bg-amber-500',
                            ].join(' ')}
                            style={{ width: `${(score.done / score.total) * 100}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs text-slate-400">
                          {score.done}/{score.total}
                        </span>
                      </div>

                      {score.missing.length > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Il manque : {score.missing.join(', ')}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>{PROJECT_STATUS_LABELS[project.status] ?? project.status}</span>

                        {project.githubUrl && (
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 hover:text-indigo-600"
                          >
                            <GithubIcon className="h-3.5 w-3.5" />
                            Code
                          </a>
                        )}

                        {project.demoUrl && (
                          <a
                            href={project.demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 hover:text-indigo-600"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Démo
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ProjectFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => void load()}
        project={editing}
      />

      <DeleteProjectModal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
        title={toDelete?.title ?? ''}
        loading={deleting}
      />
    </>
  );
}