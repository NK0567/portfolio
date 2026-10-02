"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Copy, FileText, Loader2, Plus, Star } from 'lucide-react';

import AdminShell from '@/components/admin/admin-shell';
import CoverLetterEditor from '@/components/admin/cover-letter-editor';
import {
  coverLetterService,
  type CoverLetterSummary,
  type LetterLang,
} from '@/services/cover-letter.service';
import { getErrorMessage } from '@/lib/api';

/**
 * Écran des lettres de motivation.
 *
 * Volontairement absent du site public : la page vit sous /admin, donc sous
 * AdminShell, donc derrière ProtectedRoute, et le layout d'administration pose
 * déjà robots: noindex. Côté serveur, les routes sont fermées au niveau du
 * routeur. Il faut donc un compte pour voir ne serait-ce que la liste.
 */
export default function CoverLettersPage() {
  const [letters, setLetters] = useState<CoverLetterSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (keepSelection = true) => {
      setLoading(true);
      setError(null);
      try {
        const list = await coverLetterService.list({ archived: showArchived });
        setLetters(list);

        setSelectedId((current) => {
          // La lettre ouverte peut avoir été supprimée ou archivée entre-temps.
          if (keepSelection && current && list.some((l) => l.id === current)) return current;
          return list[0]?.id ?? null;
        });
      } catch (err) {
        setError(getErrorMessage(err, 'Impossible de charger les lettres.'));
      } finally {
        setLoading(false);
      }
    },
    [showArchived]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  /**
   * Création à partir du modèle fourni par le serveur.
   *
   * Partir d'une page blanche face à une lettre de motivation est le meilleur
   * moyen de ne jamais l'écrire. Le modèle donne la structure en quatre temps,
   * il reste à remplacer les passages entre crochets.
   */
  const handleCreate = async (lang: LetterLang) => {
    setCreating(true);
    setError(null);
    try {
      const templates = await coverLetterService.templates();
      const template = templates[lang];

      const created = await coverLetterService.create({
        title: template.title,
        lang,
        subject: template.subject,
        salutation: template.salutation,
        body: template.body,
        closing: template.closing,
        // Première lettre créée : elle devient la lettre par défaut.
        isDefault: letters.length === 0,
      });

      await load(false);
      setSelectedId(created.id);
    } catch (err) {
      setError(getErrorMessage(err, 'Création impossible.'));
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setError(null);
    try {
      const copy = await coverLetterService.duplicate(id);
      await load(false);
      setSelectedId(copy.id);
    } catch (err) {
      setError(getErrorMessage(err, 'Duplication impossible.'));
    }
  };

  return (
    <AdminShell
      title="Lettres de motivation"
      subtitle="Rédige, adapte et télécharge en PDF. Visible uniquement depuis l'administration."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCreate('fr')}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Nouvelle (FR)
          </button>
          <button
            type="button"
            onClick={() => void handleCreate('en')}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            EN
          </button>
        </div>
      }
    >
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* ---------------- Liste ---------------- */}
        <aside className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Afficher les archivées
          </label>

          {loading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            </div>
          ) : letters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              <FileText className="mx-auto mb-2 h-6 w-6 text-slate-400" />
              {showArchived
                ? 'Aucune lettre archivée.'
                : 'Aucune lettre. Crée la première à partir du modèle.'}
            </div>
          ) : (
            <ul className="space-y-1">
              {letters.map((letter) => {
                const isActive = letter.id === selectedId;
                return (
                  <li key={letter.id}>
                    <div
                      className={[
                        'group flex items-start gap-2 rounded-lg border px-3 py-2 transition-colors',
                        isActive
                          ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40'
                          : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(letter.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className={[
                            'truncate text-sm font-medium',
                            isActive
                              ? 'text-indigo-700 dark:text-indigo-300'
                              : 'text-slate-700 dark:text-slate-300',
                          ].join(' ')}
                        >
                          {letter.isDefault && (
                            <Star className="mr-1 inline h-3 w-3 fill-amber-400 text-amber-400" />
                          )}
                          {letter.title}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {[letter.company, letter.position].filter(Boolean).join(' · ') ||
                            'Destinataire non renseigné'}
                        </p>
                        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">
                          {letter.lang}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDuplicate(letter.id)}
                        title="Dupliquer pour une autre candidature"
                        className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-white hover:text-indigo-600 group-hover:opacity-100 dark:hover:bg-slate-900"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* ---------------- Éditeur ---------------- */}
        <section className="min-w-0">
          {selectedId ? (
            <CoverLetterEditor
              /*
               * La clé force le remontage du composant au changement de lettre.
               * Sans elle, les champs garderaient l'état de la précédente le
               * temps du chargement, et une frappe rapide écraserait la
               * nouvelle lettre avec le contenu de l'ancienne.
               */
              key={selectedId}
              letterId={selectedId}
              onSaved={() => void load(true)}
              onDeleted={() => void load(false)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500 dark:border-slate-700">
              Sélectionne une lettre à gauche, ou crée-en une.
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
