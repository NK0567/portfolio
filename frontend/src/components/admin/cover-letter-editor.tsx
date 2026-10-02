"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Copy,
  Eye,
  FileDown,
  Loader2,
  Plus,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';

import {
  coverLetterService,
  readBlobError,
  type CoverLetter,
  type CoverLetterInput,
  type CoverLetterRender,
  type LetterLang,
} from '@/services/cover-letter.service';
import { getErrorMessage } from '@/lib/api';

const inputClass =
  'mt-1 w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const areaClass =
  'w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm leading-6 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';

/** Variables proposées sous le corps, insérables au curseur. */
const VARIABLES: Array<{ token: string; hint: string }> = [
  { token: '{{entreprise}}', hint: "Nom de l'entreprise" },
  { token: '{{poste}}', hint: 'Intitulé du poste' },
  { token: '{{destinataire}}', hint: 'Personne à qui écrire' },
  { token: '{{ville}}', hint: "Ville de l'entreprise" },
  { token: '{{nom}}', hint: 'Ton nom, lu depuis le profil' },
  { token: '{{email}}', hint: 'Ton e-mail, lu depuis le profil' },
];

/**
 * Repères de longueur.
 *
 * En dessous de 200 mots, une lettre dit rarement quelque chose. Au-delà de
 * 400, elle n'est plus lue en entier. Entre les deux, le compteur reste vert
 * et on n'y pense plus.
 */
const WORD_MIN = 200;
const WORD_MAX = 400;

interface Props {
  letterId: string;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function CoverLetterEditor({ letterId, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<CoverLetter | null>(null);
  const [preview, setPreview] = useState<CoverLetterRender | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Proposé seulement après un refus du serveur pour variables manquantes. */
  const [offerForce, setOfferForce] = useState(false);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  /** Dernier champ de corps touché, pour savoir où insérer une variable. */
  const lastFocused = useRef<{ index: number; start: number; end: number } | null>(null);

  /* ---------------- Chargement ---------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const letter = await coverLetterService.get(letterId);
      setForm({ ...letter, body: Array.isArray(letter.body) ? letter.body : [] });
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger cette lettre.'));
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [letterId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Le rendu serveur donne le texte final et les variables non résolues. */
  const refreshRender = useCallback(async () => {
    try {
      setPreview(await coverLetterService.render(letterId));
    } catch {
      // Un aperçu indisponible ne doit pas empêcher d'écrire : on laisse
      // simplement le panneau de droite sur sa dernière version connue.
      setPreview(null);
    }
  }, [letterId]);

  useEffect(() => {
    void refreshRender();
  }, [refreshRender]);

  /* ---------------- Libération des URLs d'aperçu ---------------- */

  useEffect(() => {
    return () => {
      coverLetterService.revokeObjectUrl(pdfUrl);
    };
  }, [pdfUrl]);

  /* ---------------- Statistiques locales ---------------- */

  /*
   * Compteur calculé dans le navigateur, et non repris du rendu serveur :
   * il doit bouger pendant la frappe, avant tout enregistrement.
   */
  const localStats = useMemo(() => {
    if (!form) return { words: 0, characters: 0 };
    const text = [form.subject, form.salutation, ...form.body, form.closing].join(' ');
    return {
      words: text.split(/\s+/).filter(Boolean).length,
      characters: text.length,
    };
  }, [form]);

  const wordState: 'low' | 'ok' | 'high' =
    localStats.words < WORD_MIN ? 'low' : localStats.words > WORD_MAX ? 'high' : 'ok';

  /* ---------------- Mutations du formulaire ---------------- */

  const patch = <K extends keyof CoverLetter>(key: K, value: CoverLetter[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const patchParagraph = (index: number, value: string) =>
    setForm((current) => {
      if (!current) return current;
      const body = [...current.body];
      body[index] = value;
      return { ...current, body };
    });

  const addParagraph = () =>
    setForm((current) => (current ? { ...current, body: [...current.body, ''] } : current));

  const removeParagraph = (index: number) =>
    setForm((current) =>
      current ? { ...current, body: current.body.filter((_, i) => i !== index) } : current
    );

  const moveParagraph = (index: number, direction: -1 | 1) =>
    setForm((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.body.length) return current;

      const body = [...current.body];
      const moved = body[index] as string;
      body[index] = body[target] as string;
      body[target] = moved;
      return { ...current, body };
    });

  /** Insère la variable à l'endroit du curseur, ou en fin du dernier champ touché. */
  const insertVariable = (token: string) => {
    setForm((current) => {
      if (!current) return current;

      const position = lastFocused.current;
      if (!position || position.index >= current.body.length) {
        // Aucun champ touché : on ajoute à la fin du dernier paragraphe plutôt
        // que de ne rien faire et laisser croire au bouton cassé.
        const body = [...current.body];
        const lastIndex = Math.max(0, body.length - 1);
        body[lastIndex] = `${body[lastIndex] ?? ''}${token}`;
        return { ...current, body };
      }

      const body = [...current.body];
      const value = body[position.index] ?? '';
      body[position.index] =
        value.slice(0, position.start) + token + value.slice(position.end);
      return { ...current, body };
    });
  };

  /* ---------------- Actions ---------------- */

  const handleSave = async () => {
    if (!form) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    // Les paragraphes vides sont retirés avant l'envoi : le serveur les
    // refuserait, et laisser l'utilisateur deviner lequel est en cause est
    // une perte de temps inutile.
    const body = form.body.map((p) => p.trim()).filter(Boolean);

    if (body.length === 0) {
      setError('La lettre doit contenir au moins un paragraphe.');
      setSaving(false);
      return;
    }

    const payload: Partial<CoverLetterInput> = {
      title: form.title.trim(),
      lang: form.lang,
      company: form.company?.trim() || undefined,
      position: form.position?.trim() || undefined,
      recipient: form.recipient?.trim() || undefined,
      companyCity: form.companyCity?.trim() || undefined,
      subject: form.subject.trim(),
      salutation: form.salutation.trim(),
      body,
      closing: form.closing.trim(),
      signature: form.signature?.trim() || undefined,
      isDefault: form.isDefault,
    };

    try {
      const updated = await coverLetterService.update(form.id, payload);
      setForm({ ...updated, body: Array.isArray(updated.body) ? updated.body : [] });
      setNotice('Lettre enregistrée.');
      await refreshRender();
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "L'enregistrement a échoué."));
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (force = false) => {
    setDownloading(true);
    setError(null);
    setOfferForce(false);

    try {
      await coverLetterService.download(letterId, force);
      setNotice('PDF téléchargé.');
    } catch (err) {
      const message = await readBlobError(err, 'Téléchargement impossible.');
      setError(message);
      // Le serveur refuse tant que des variables ne sont pas remplacées. On
      // propose alors explicitement le passage en force, pour un brouillon.
      if (message.toLowerCase().includes('variables non remplacées')) {
        setOfferForce(true);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handlePdfPreview = async () => {
    setPdfLoading(true);
    setError(null);
    try {
      coverLetterService.revokeObjectUrl(pdfUrl);
      setPdfUrl(await coverLetterService.previewObjectUrl(letterId));
    } catch (err) {
      setError(await readBlobError(err, "L'aperçu PDF n'a pas pu être généré."));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCopyText = async () => {
    if (!preview) return;

    const text = [
      preview.subject,
      '',
      preview.salutation,
      '',
      ...preview.paragraphs.flatMap((p) => [p, '']),
      preview.closing,
      '',
      preview.signature,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setNotice('Texte copié, prêt à coller dans un e-mail.');
    } catch {
      // navigator.clipboard est indisponible hors HTTPS et hors localhost.
      setError("Copie refusée par le navigateur. Sélectionne le texte de l'aperçu à droite.");
    }
  };

  /**
   * Archiver plutôt que supprimer.
   *
   * Une candidature passée reste utile : c'est le texte qui a obtenu, ou
   * n'a pas obtenu, un entretien. La suppression existe à côté pour les
   * brouillons ratés, mais elle ne doit pas être le seul geste disponible.
   */
  const handleArchive = async () => {
    if (!form) return;
    setError(null);
    try {
      await coverLetterService.update(form.id, { isArchived: !form.isArchived });
      setNotice(form.isArchived ? 'Lettre désarchivée.' : 'Lettre archivée.');
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, 'Archivage impossible.'));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer définitivement cette lettre ?')) return;

    try {
      await coverLetterService.remove(letterId);
      onDeleted();
    } catch (err) {
      setError(getErrorMessage(err, 'Suppression impossible.'));
    }
  };

  /* ---------------- Rendu ---------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {error ?? 'Lettre introuvable.'}
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      {/* ---------------- Colonne gauche : édition ---------------- */}
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-2">
              <p className="whitespace-pre-line">{error}</p>
              {offerForce && (
                <button
                  type="button"
                  onClick={() => void handleDownload(true)}
                  className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/40"
                >
                  Télécharger quand même (brouillon)
                </button>
              )}
            </div>
          </div>
        )}

        {notice && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Candidature
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Nom interne</label>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => patch('title', e.target.value)}
                placeholder="Dev Full Stack - Luxembourg"
              />
              <p className="mt-1 text-xs text-slate-400">
                Jamais imprimé. Sert à retrouver la lettre dans la liste.
              </p>
            </div>

            <div>
              <label className={labelClass}>Entreprise</label>
              <input
                className={inputClass}
                value={form.company ?? ''}
                onChange={(e) => patch('company', e.target.value)}
                placeholder="Remplace {{entreprise}}"
              />
            </div>

            <div>
              <label className={labelClass}>Poste</label>
              <input
                className={inputClass}
                value={form.position ?? ''}
                onChange={(e) => patch('position', e.target.value)}
                placeholder="Remplace {{poste}}"
              />
            </div>

            <div>
              <label className={labelClass}>Destinataire</label>
              <input
                className={inputClass}
                value={form.recipient ?? ''}
                onChange={(e) => patch('recipient', e.target.value)}
                placeholder="Service recrutement"
              />
            </div>

            <div>
              <label className={labelClass}>Ville de l&apos;entreprise</label>
              <input
                className={inputClass}
                value={form.companyCity ?? ''}
                onChange={(e) => patch('companyCity', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Langue</label>
              <select
                className={inputClass}
                value={form.lang}
                onChange={(e) => patch('lang', e.target.value as LetterLang)}
              >
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
              </select>
            </div>

            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  checked={form.isDefault}
                  onChange={(e) => patch('isDefault', e.target.checked)}
                />
                Lettre proposée par défaut
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Texte</h3>

            <span
              className={[
                'rounded-full px-2.5 py-1 text-xs font-medium',
                wordState === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
              ].join(' ')}
            >
              {localStats.words} mots
              {wordState === 'low' && ' · trop court'}
              {wordState === 'high' && ' · trop long'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Objet</label>
              <input
                className={inputClass}
                value={form.subject}
                onChange={(e) => patch('subject', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Formule d&apos;appel</label>
              <input
                className={inputClass}
                value={form.salutation}
                onChange={(e) => patch('salutation', e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className={labelClass}>Paragraphes</label>

              {form.body.map((paragraph, index) => (
                <div key={index} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">
                      Paragraphe {index + 1} · {paragraph.trim().split(/\s+/).filter(Boolean).length} mots
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveParagraph(index, -1)}
                        disabled={index === 0}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        title="Monter"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveParagraph(index, 1)}
                        disabled={index === form.body.length - 1}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        title="Descendre"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeParagraph(index)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        title="Supprimer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    className={areaClass}
                    rows={5}
                    value={paragraph}
                    onChange={(e) => patchParagraph(index, e.target.value)}
                    onSelect={(e) => {
                      const target = e.currentTarget;
                      lastFocused.current = {
                        index,
                        start: target.selectionStart,
                        end: target.selectionEnd,
                      };
                    }}
                  />
                </div>
              ))}

              {form.body.length < 6 && (
                <button
                  type="button"
                  onClick={addParagraph}
                  className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un paragraphe
                </button>
              )}
            </div>

            <div>
              <label className={labelClass}>Formule de politesse</label>
              <textarea
                className={`${areaClass} mt-1`}
                rows={2}
                value={form.closing}
                onChange={(e) => patch('closing', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Signature</label>
              <input
                className={inputClass}
                value={form.signature ?? ''}
                onChange={(e) => patch('signature', e.target.value)}
                placeholder="Vide : ton nom du profil sera utilisé"
              />
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Variables, cliquer pour insérer au curseur
            </p>
            <div className="flex flex-wrap gap-2">
              {VARIABLES.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => insertVariable(variable.token)}
                  title={variable.hint}
                  className="rounded-full border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  {variable.token}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>

          <button
            type="button"
            onClick={() => void handleDownload(false)}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Télécharger le PDF
          </button>

          <button
            type="button"
            onClick={() => void handlePdfPreview()}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Aperçu PDF
          </button>

          <button
            type="button"
            onClick={() => void handleCopyText()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Copy className="h-4 w-4" />
            Copier le texte
          </button>

          <button
            type="button"
            onClick={() => void handleArchive()}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Archive className="h-4 w-4" />
            {form.isArchived ? 'Désarchiver' : 'Archiver'}
          </button>

          <button
            type="button"
            onClick={() => void handleDelete()}
            className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        </div>
      </div>

      {/* ---------------- Colonne droite : aperçu ---------------- */}
      <div className="space-y-4">
        {preview && preview.profileMissing && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Ton profil n&apos;est pas renseigné. L&apos;en-tête sortira sans nom ni coordonnées, et
            le téléchargement sera refusé. Complète-le dans Paramètres.
          </div>
        )}

        {preview && preview.missingVariables.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Variables non remplacées : {preview.missingVariables.join(', ')}. Elles s&apos;imprimeront
            entre crochets.
          </div>
        )}

        {preview && preview.stats.estimatedPages > 1 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Le texte déborde sur une seconde page. Coupe environ{' '}
            {Math.max(0, preview.stats.words - WORD_MAX)} mots pour revenir à une page.
          </div>
        )}

        {pdfUrl ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Aperçu PDF</h3>
              <button
                type="button"
                onClick={() => {
                  coverLetterService.revokeObjectUrl(pdfUrl);
                  setPdfUrl(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Fermer
              </button>
            </div>
            <iframe
              src={pdfUrl}
              title="Aperçu de la lettre"
              className="h-[800px] w-full rounded-xl border border-slate-200 dark:border-slate-800"
            />
          </div>
        ) : (
          preview && (
            <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <header className="border-b border-slate-200 pb-3 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {preview.sender.fullName || 'Nom non renseigné'}
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  {preview.sender.headline}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {[preview.sender.location, preview.sender.phone, preview.sender.email]
                    .filter(Boolean)
                    .join('  ·  ')}
                </p>
              </header>

              <div className="text-right text-xs text-slate-500">
                {preview.recipientBlock.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p className="mt-2">{preview.dateLine}</p>
              </div>

              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Objet : {preview.subject}
              </p>

              <p>{preview.salutation}</p>

              {preview.paragraphs.map((paragraph, index) => (
                <p key={index} className="text-justify">
                  {paragraph}
                </p>
              ))}

              <p className="text-justify">{preview.closing}</p>

              <p className="pt-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                {preview.signature}
              </p>

              <footer className="border-t border-slate-200 pt-3 text-xs text-slate-400 dark:border-slate-800">
                {preview.stats.words} mots · {preview.stats.paragraphs} paragraphes ·{' '}
                {preview.stats.estimatedPages} page{preview.stats.estimatedPages > 1 ? 's' : ''}
              </footer>
            </article>
          )
        )}
      </div>
    </div>
  );
}
