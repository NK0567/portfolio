"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, AlertCircle, X, Building2 } from 'lucide-react';

import AdminShell from '@/components/admin/admin-shell';
import { experienceService, type ExperienceFormInput } from '@/services/experience.service';
import { getErrorMessage } from '@/lib/api';
import type { Experience } from '@/types/api';

const inputClass =
  'mt-1 w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const areaClass =
  'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';

interface FormState {
  company: string;
  location: string;
  roleFr: string;
  descriptionFr: string;
  achievementsFr: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  order: number;
}

const emptyForm: FormState = {
  company: '',
  location: '',
  roleFr: '',
  descriptionFr: '',
  achievementsFr: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  order: 0,
};

const toISODate = (value: string) => (value ? new Date(value).toISOString() : undefined);
const toInputDate = (value?: string | null) => (value ? value.slice(0, 10) : '');

export default function ExperiencesPage() {
  const [items, setItems] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
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
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (exp: Experience) => {
    setEditingId(exp.id);
    setForm({
      company: exp.company,
      location: exp.location,
      roleFr: exp.role?.fr ?? '',
      descriptionFr: exp.description?.fr ?? '',
      achievementsFr: (exp.achievements?.fr ?? []).join('\n'),
      startDate: toInputDate(exp.startDate),
      endDate: toInputDate(exp.endDate),
      isCurrent: exp.isCurrent,
      order: exp.order,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    // Une réalisation par ligne : c'est la saisie la plus rapide, et elle
    // correspond exactement aux puces imprimées sur le CV.
    const achievements = form.achievementsFr
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload: ExperienceFormInput = {
      company: form.company.trim(),
      location: form.location.trim(),
      role: { fr: form.roleFr.trim(), en: form.roleFr.trim() },
      description: { fr: form.descriptionFr.trim(), en: form.descriptionFr.trim() },
      achievements: { fr: achievements, en: achievements },
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

  return (
    <AdminShell
      title="Expériences"
      subtitle="Ton parcours professionnel. Chaque entrée apparaît automatiquement sur ton CV."
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
          {items.map((exp) => (
            <article
              key={exp.id}
              className="flex items-start gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Building2 className="h-5 w-5" />
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
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingId ? "Modifier l'expérience" : 'Nouvelle expérience'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 p-1">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Entreprise *</label>
                  <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="eScrutin" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Lieu *</label>
                  <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Yaoundé" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Poste *</label>
                <input required value={form.roleFr} onChange={(e) => setForm({ ...form, roleFr: e.target.value })} placeholder="Développeur full-stack" className={inputClass} />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Description *</label>
                <textarea required rows={2} value={form.descriptionFr} onChange={(e) => setForm({ ...form, descriptionFr: e.target.value })} className={areaClass} />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Réalisations <span className="font-normal text-slate-400">— une par ligne, reprises telles quelles sur le CV</span>
                </label>
                <textarea rows={3} value={form.achievementsFr} onChange={(e) => setForm({ ...form, achievementsFr: e.target.value })} placeholder={'Conçu et développé UniPay...\nMis en place l\'authentification JWT...'} className={areaClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Date de début *</label>
                  <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Date de fin</label>
                  <input type="date" disabled={form.isCurrent} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`${inputClass} disabled:opacity-50`} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked, endDate: e.target.checked ? '' : form.endDate })} className="accent-indigo-600 h-4 w-4" />
                Poste actuel
              </label>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">Annuler</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-60">
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
