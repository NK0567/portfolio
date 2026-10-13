"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, AlertCircle, X, Building2, Upload } from 'lucide-react';

import AdminShell from '@/components/admin/admin-shell';
import { experienceService, type ExperienceFormInput } from '@/services/experience.service';
import { uploadService } from '@/services/upload.service';
import { mediaUrl } from '@/lib/assets';
import { getErrorMessage } from '@/lib/api';
import type { Experience } from '@/types/api';

const inputClass =
  'mt-1 w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const areaClass =
  'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const labelClass = 'text-xs font-semibold text-slate-800 dark:text-slate-200';

type Lang = 'fr' | 'en';

interface Localized {
  role: string;
  description: string;
  achievements: string;
}

interface FormState {
  company: string;
  location: string;
  logoUrl: string;
  fr: Localized;
  en: Localized;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  order: number;
}

const emptyLocalized: Localized = { role: '', description: '', achievements: '' };

const emptyForm: FormState = {
  company: '',
  location: '',
  logoUrl: '',
  fr: emptyLocalized,
  en: emptyLocalized,
  startDate: '',
  endDate: '',
  isCurrent: false,
  order: 0,
};

const toISODate = (value: string) => (value ? new Date(value).toISOString() : undefined);
const toInputDate = (value?: string | null) => (value ? value.slice(0, 10) : '');
const lines = (value: string) => value.split('\n').map((l) => l.trim()).filter(Boolean);

/**
 * Expériences professionnelles : entreprise, logo, poste, réalisations.
 *
 * Les textes existent en français et en anglais (onglets). Un champ anglais
 * laissé vide reprend le français sur le CV anglais : on peut donc traduire
 * plus tard sans rien casser.
 */
export default function ExperiencesPage() {
  const [items, setItems] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [lang, setLang] = useState<Lang>('fr');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await experienceService.getAll());
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger les expériences.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, order: items.length });
    setLang('fr');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (exp: Experience) => {
    const localized = (l: Lang): Localized => ({
      role: exp.role?.[l] ?? '',
      description: exp.description?.[l] ?? '',
      achievements: (exp.achievements?.[l] ?? []).join('\n'),
    });
    setEditingId(exp.id);
    setForm({
      company: exp.company,
      location: exp.location,
      logoUrl: exp.logoUrl ?? '',
      fr: localized('fr'),
      en: localized('en'),
      startDate: toInputDate(exp.startDate),
      endDate: toInputDate(exp.endDate),
      isCurrent: exp.isCurrent,
      order: exp.order,
    });
    setLang('fr');
    setFormError(null);
    setModalOpen(true);
  };

  const setLocalized = (key: keyof Localized, value: string) =>
    setForm((f) => ({ ...f, [lang]: { ...f[lang], [key]: value } }));

  const handleLogo = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const uploaded = await uploadService.image(file);
      setForm((f) => ({ ...f, logoUrl: uploaded.path }));
    } catch (err) {
      setFormError(getErrorMessage(err, "Impossible d'envoyer le logo."));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload: ExperienceFormInput = {
      company: form.company.trim(),
      location: form.location.trim(),
      logoUrl: form.logoUrl || null,
      role: { fr: form.fr.role.trim(), en: form.en.role.trim() || form.fr.role.trim() },
      description: {
        fr: form.fr.description.trim(),
        en: form.en.description.trim() || form.fr.description.trim(),
      },
      achievements: { fr: lines(form.fr.achievements), en: lines(form.en.achievements) },
      startDate: toISODate(form.startDate)!,
      // Un poste en cours ne doit pas avoir de date de fin : le backend le
      // refuse, on aligne donc le formulaire sur cette règle.
      endDate: form.isCurrent ? null : toISODate(form.endDate) ?? null,
      isCurrent: form.isCurrent,
      order: form.order,
    };

    try {
      if (editingId) await experienceService.update(editingId, payload);
      else await experienceService.create(payload);
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Impossible d'enregistrer l'expérience."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exp: Experience) => {
    if (!window.confirm(`Supprimer l'expérience chez « ${exp.company} » ?`)) return;
    try {
      await experienceService.delete(exp.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Suppression impossible.'));
    }
  };

  const period = (exp: Experience) => {
    const start = new Date(exp.startDate).getFullYear();
    if (exp.isCurrent) return `${start} – aujourd'hui`;
    if (!exp.endDate) return String(start);
    return `${start} – ${new Date(exp.endDate).getFullYear()}`;
  };

  const current = form[lang];
  const logo = mediaUrl(form.logoUrl);

  return (
    <AdminShell
      title="Expériences"
      subtitle="Ton parcours professionnel et les entreprises par lesquelles tu es passé. Chaque entrée apparaît sur le site et sur ton CV."
      actions={
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Ajouter</span>
        </button>
      }
    >
      {error && (
        <div className="flex gap-2 p-3 text-sm rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="whitespace-pre-line">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-slate-500 dark:text-slate-400">Aucune expérience enregistrée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((exp) => {
            const expLogo = mediaUrl(exp.logoUrl);
            return (
              <article
                key={exp.id}
                className="flex items-start gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  {expLogo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={expLogo} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {exp.role?.fr || 'Poste non renseigné'}
                    </h3>
                    {exp.isCurrent && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        En cours
                      </span>
                    )}
                    {exp.role?.en && exp.role.en !== exp.role.fr && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                        EN
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                    {exp.company}
                    {exp.location ? `, ${exp.location}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{period(exp)}</p>

                  {(exp.achievements?.fr ?? []).length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.achievements.fr.map((a, i) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                          <span className="text-slate-400">•</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(exp)}
                    className="p-2 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exp)}
                    className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingId ? "Modifier l'expérience" : 'Nouvelle expérience'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 p-1" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="flex gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="whitespace-pre-line">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Entreprise */}
              <div className="flex items-end gap-3">
                <div className="shrink-0">
                  <label className={labelClass}>Logo</label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <label className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-slate-50 hover:border-indigo-500 dark:border-slate-700 dark:bg-slate-800" title="Choisir un logo">
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                      ) : logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={logo} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <Upload className="h-4 w-4 text-slate-400" />
                      )}
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleLogo(e.target.files?.[0])} />
                    </label>
                    {logo && (
                      <button type="button" onClick={() => setForm({ ...form, logoUrl: '' })} className="p-1 text-slate-400 hover:text-red-600" aria-label="Retirer le logo">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Entreprise *</label>
                  <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="eScrutin" className={inputClass} />
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Lieu *</label>
                  <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Yaoundé" className={inputClass} />
                </div>
              </div>

              {/* Textes FR / EN */}
              <div className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Poste et réalisations</p>
                  <div className="flex rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
                    {(['fr', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLang(l)}
                        className={`rounded px-2.5 py-0.5 text-xs font-semibold ${lang === l ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                      >
                        {l === 'fr' ? 'Français' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>
                {lang === 'en' && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-300">Pour le CV anglais. Vide : le français est repris.</p>
                )}

                <div>
                  <label className={labelClass}>Poste {lang === 'fr' && '*'}</label>
                  <input
                    required={lang === 'fr'}
                    value={current.role}
                    onChange={(e) => setLocalized('role', e.target.value)}
                    placeholder={lang === 'fr' ? 'Développeur full-stack' : 'Full-stack developer'}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Description {lang === 'fr' && '*'}</label>
                  <textarea required={lang === 'fr'} rows={2} value={current.description} onChange={(e) => setLocalized('description', e.target.value)} className={areaClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    Réalisations <span className="font-normal text-slate-400">— une par ligne, reprises sur le CV</span>
                  </label>
                  <textarea
                    rows={3}
                    value={current.achievements}
                    onChange={(e) => setLocalized('achievements', e.target.value)}
                    placeholder={lang === 'fr' ? 'Conçu et développé UniPay...' : 'Designed and built UniPay...'}
                    className={areaClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Début *</label>
                  <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fin</label>
                  <input type="date" disabled={form.isCurrent} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`${inputClass} disabled:opacity-50`} />
                </div>
                <div>
                  <label className={labelClass}>Ordre</label>
                  <input type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })} className={inputClass} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked, endDate: e.target.checked ? '' : form.endDate })} className="accent-indigo-600 h-4 w-4" />
                Poste actuel
              </label>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">Annuler</button>
                <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
