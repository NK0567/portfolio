"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import AdminShell from '@/components/admin/admin-shell';
import { labService, type LabFormInput } from '@/services/lab.service';
import { uploadService } from '@/services/upload.service';
import { getErrorMessage } from '@/lib/api';
import {
  LAB_DIFFICULTIES,
  LAB_DIFFICULTY_LABELS,
  LAB_PLATFORMS,
  LAB_PLATFORM_LABELS,
  type CyberLab,
  type LabDifficulty,
  type LabPlatform,
} from '@/types/api';

/**
 * Labs de sécurité.
 *
 * Le formulaire suit l'ordre d'un bon write-up : ce qui a été exploité,
 * comment, puis comment on le corrige. La remédiation a son propre champ
 * parce que c'est elle qui distingue un ingénieur sécurité d'un joueur de
 * CTF, et qu'un champ dédié rappelle de l'écrire.
 */

const inputClass =
  'mt-1 w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const areaClass =
  'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm leading-6 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const labelClass = 'text-xs font-semibold text-slate-800 dark:text-slate-200';
const hintClass = 'mt-1 text-xs text-slate-400';

const ASSET_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/api\/?$/, '');
const asset = (path: string) => (/^https?:\/\//.test(path) ? path : `${ASSET_BASE}${path}`);

interface FormState {
  title: string;
  platform: LabPlatform;
  difficulty: LabDifficulty;
  category: string;
  completedAt: string;
  summary: string;
  content: string;
  remediation: string;
  techniques: string;
  tools: string;
  writeUpUrl: string;
  badgeUrl: string;
  order: number;
  isPublished: boolean;
}

const emptyForm: FormState = {
  title: '',
  platform: 'HTB',
  difficulty: 'Medium',
  category: '',
  completedAt: '',
  summary: '',
  content: '',
  remediation: '',
  techniques: '',
  tools: '',
  writeUpUrl: '',
  badgeUrl: '',
  order: 0,
  isPublished: false,
};

/** "nmap, Burp Suite , ,gobuster" -> ["nmap", "Burp Suite", "gobuster"] */
const splitList = (value: string) =>
  value
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);

const toInputDate = (v?: string | null) => (v ? v.slice(0, 10) : '');

const DIFFICULTY_TONE: Record<LabDifficulty, string> = {
  Easy: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40',
  Medium: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40',
  Hard: 'text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-950/40',
  Insane: 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40',
};

export default function LabsPage() {
  const [items, setItems] = useState<CyberLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await labService.getAll());
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger les labs.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, completedAt: new Date().toISOString().slice(0, 10) });
    setFormError(null);
    setModalOpen(true);
  };

  /*
   * La liste ne contient pas toujours le write-up complet : on relit le lab
   * par son slug avant d'ouvrir le formulaire, pour ne jamais enregistrer un
   * contenu vide par-dessus le vrai.
   */
  const openEdit = async (lab: CyberLab) => {
    setFormError(null);
    try {
      const full = lab.content ? lab : await labService.getBySlug(lab.slug);
      setEditingId(full.id);
      setForm({
        title: full.title,
        platform: full.platform,
        difficulty: full.difficulty,
        category: full.category ?? '',
        completedAt: toInputDate(full.completedAt),
        summary: full.summary?.fr ?? '',
        content: full.content?.fr ?? '',
        remediation: full.remediation?.fr ?? '',
        techniques: (full.techniques ?? []).join(', '),
        tools: (full.tools ?? []).join(', '),
        writeUpUrl: full.writeUpUrl ?? '',
        badgeUrl: full.badgeUrl ?? '',
        order: full.order,
        isPublished: full.isPublished,
      });
      setModalOpen(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible d’ouvrir ce lab.'));
    }
  };

  const handleBadge = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const uploaded = await uploadService.image(file);
      set('badgeUrl', uploaded.path);
    } catch (err) {
      setFormError(getErrorMessage(err, "Impossible d'envoyer l'image."));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    /*
     * Le site est affiché en français : la version anglaise reçoit le même
     * texte en attendant le sélecteur de langue, comme pour les autres
     * contenus. Le backend exige les deux clés.
     */
    const both = (v: string) => ({ fr: v.trim(), en: v.trim() });

    const payload: LabFormInput = {
      title: form.title.trim(),
      platform: form.platform,
      difficulty: form.difficulty,
      category: form.category.trim(),
      completedAt: new Date(form.completedAt).toISOString(),
      summary: both(form.summary),
      content: both(form.content),
      remediation: both(form.remediation),
      techniques: splitList(form.techniques),
      tools: splitList(form.tools),
      writeUpUrl: form.writeUpUrl.trim(),
      badgeUrl: form.badgeUrl,
      order: form.order,
      isPublished: form.isPublished,
    };

    try {
      if (editingId) await labService.update(editingId, payload);
      else await labService.create(payload);
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Impossible d'enregistrer le lab."));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (lab: CyberLab) => {
    setTogglingId(lab.id);
    setError(null);
    try {
      await labService.update(lab.id, { isPublished: !lab.isPublished });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Changement de statut impossible.'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (lab: CyberLab) => {
    if (!window.confirm(`Supprimer « ${lab.title} » et son write-up ?`)) return;
    try { await labService.delete(lab.id); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Suppression impossible.')); }
  };

  const published = items.filter((l) => l.isPublished).length;

  return (
    <AdminShell
      title="Labs sécurité"
      subtitle={
        items.length === 0
          ? 'Machines et challenges résolus, avec leur write-up. La section publique reste masquée tant que rien n’est publié.'
          : `${published} publié${published > 1 ? 's' : ''} sur ${items.length}. Seuls les labs publiés apparaissent sur le site.`
      }
      actions={
        <button onClick={openCreate} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-2 rounded-lg text-sm">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouveau lab</span>
        </button>
      }
    >
      {error && (
        <div className="flex gap-2 p-3 text-sm rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span className="whitespace-pre-line">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="text-slate-700 dark:text-slate-300 font-medium">Aucun lab pour l’instant.</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Commence par une machine dont tu te souviens bien. Ce qui intéresse un recruteur, c’est le
            raisonnement : les hypothèses, ce qui a échoué, et comment corriger la faille.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((lab) => (
            <article key={lab.id} className="flex items-start gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                {lab.badgeUrl
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={asset(lab.badgeUrl)} alt="" className="h-full w-full object-cover" />
                  : <ShieldCheck className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{lab.title}</h3>
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${DIFFICULTY_TONE[lab.difficulty] ?? ''}`}>
                    {LAB_DIFFICULTY_LABELS[lab.difficulty] ?? lab.difficulty}
                  </span>
                  {lab.isPublished ? (
                    <span className="rounded px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/50">Publié</span>
                  ) : (
                    <span className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800">Brouillon</span>
                  )}
                </div>
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                  {LAB_PLATFORM_LABELS[lab.platform] ?? lab.platform}
                  {lab.category ? ` · ${lab.category}` : ''}
                  <span className="text-slate-400 font-normal"> · {new Date(lab.completedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{lab.summary?.fr}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {lab.isPublished && (
                  <Link href={`/labs/${lab.slug}`} target="_blank" className="p-2 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Voir sur le site"><ExternalLink className="h-4 w-4" /></Link>
                )}
                <button
                  onClick={() => togglePublish(lab)}
                  disabled={togglingId === lab.id}
                  className="p-2 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                  aria-label={lab.isPublished ? 'Repasser en brouillon' : 'Publier'}
                  title={lab.isPublished ? 'Repasser en brouillon' : 'Publier'}
                >
                  {togglingId === lab.id ? <Loader2 className="h-4 w-4 animate-spin" /> : lab.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => openEdit(lab)} className="p-2 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Modifier"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(lab)} className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingId ? 'Modifier le lab' : 'Nouveau lab'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 p-1" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>

            {formError && (
              <div className="flex gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span className="whitespace-pre-line">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>Nom de la machine ou du challenge *</label>
                <input required minLength={3} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Forest" className={inputClass} />
                {editingId && <p className={hintClass}>Changer le nom ne modifie pas l’adresse publique du write-up.</p>}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Plateforme *</label>
                  <select value={form.platform} onChange={(e) => set('platform', e.target.value as LabPlatform)} className={inputClass}>
                    {LAB_PLATFORMS.map((p) => <option key={p} value={p}>{LAB_PLATFORM_LABELS[p]}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Difficulté *</label>
                  <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value as LabDifficulty)} className={inputClass}>
                    {LAB_DIFFICULTIES.map((d) => <option key={d} value={d}>{LAB_DIFFICULTY_LABELS[d]}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Catégorie</label>
                  <input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Active Directory" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Résolu le *</label>
                  <input type="date" required value={form.completedAt} onChange={(e) => set('completedAt', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Résumé *</label>
                <textarea required rows={2} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="AS-REP roasting d’un compte de service, puis abus des droits WriteDACL pour obtenir DCSync." className={areaClass} />
                <p className={hintClass}>Deux phrases : la faille et l’impact. C’est ce qui s’affiche sur la carte.</p>
              </div>

              <div>
                <label className={labelClass}>Write-up</label>
                <textarea rows={12} value={form.content} onChange={(e) => set('content', e.target.value)} className={`${areaClass} font-mono text-[13px]`}
                  placeholder={'## Reconnaissance\nCe que le scan a révélé, et l’hypothèse retenue.\n\n## Exploitation\nCe qui a marché, et ce qui a échoué avant.\n\n```\nnmap -sC -sV 10.10.10.161\n```\n\n## Élévation de privilèges\n...'} />
                <p className={hintClass}>
                  Paragraphes séparés par une ligne vide. <code>## Titre</code> pour un intertitre, trois accents graves pour un bloc de commandes. Obligatoire pour publier.
                </p>
              </div>

              <div>
                <label className={labelClass}>Remédiation</label>
                <textarea rows={5} value={form.remediation} onChange={(e) => set('remediation', e.target.value)} placeholder="Activer la pré-authentification Kerberos sur tous les comptes, retirer WriteDACL au groupe Exchange Windows Permissions..." className={areaClass} />
                <p className={hintClass}>Ce que tu recommanderais à l’équipe qui administre la machine. La partie que presque personne n’écrit.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Techniques</label>
                  <input value={form.techniques} onChange={(e) => set('techniques', e.target.value)} placeholder="AS-REP roasting, DCSync" className={inputClass} />
                  <p className={hintClass}>Séparées par des virgules.</p>
                </div>
                <div>
                  <label className={labelClass}>Outils</label>
                  <input value={form.tools} onChange={(e) => set('tools', e.target.value)} placeholder="nmap, BloodHound, impacket" className={inputClass} />
                  <p className={hintClass}>Séparés par des virgules.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-start">
                <div>
                  <label className={labelClass}>Lien complémentaire</label>
                  <input type="url" value={form.writeUpUrl} onChange={(e) => set('writeUpUrl', e.target.value)} placeholder="https://github.com/.../scripts" className={inputClass} />
                  <p className={hintClass}>Dépôt de scripts ou PoC. Le write-up, lui, reste ici.</p>
                </div>
                <div>
                  <label className={labelClass}>Badge</label>
                  <div className="mt-1 flex items-center gap-2">
                    {form.badgeUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={asset(form.badgeUrl)} alt="" className="h-10 w-10 rounded-md border border-slate-200 dark:border-slate-700 object-cover" />
                    )}
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 px-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {form.badgeUrl ? 'Changer' : 'Ajouter'}
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleBadge(e.target.files?.[0])} />
                    </label>
                    {form.badgeUrl && (
                      <button type="button" onClick={() => set('badgeUrl', '')} className="p-2 text-slate-400 hover:text-red-600" aria-label="Retirer le badge"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Ordre</label>
                  <input type="number" min={0} value={form.order} onChange={(e) => set('order', Number(e.target.value) || 0)} className={`${inputClass} !w-20`} />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} className="accent-indigo-600 h-4 w-4 mt-0.5" />
                <span>
                  Publier sur le site
                  <span className="block text-xs text-slate-400">Décoché, le lab reste un brouillon : invisible pour les visiteurs, son adresse renvoie une page introuvable.</span>
                </span>
              </label>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">Annuler</button>
                <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}{editingId ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
