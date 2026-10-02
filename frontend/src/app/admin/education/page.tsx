"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, AlertCircle, X, GraduationCap } from 'lucide-react';

import AdminShell from '@/components/admin/admin-shell';
import { educationService, type EducationFormInput } from '@/services/education.service';
import { getErrorMessage } from '@/lib/api';
import type { Education } from '@/types/api';

const inputClass =
  'mt-1 w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';

interface FormState {
  degreeFr: string;
  school: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  order: number;
}

const emptyForm: FormState = {
  degreeFr: '', school: '', location: '', startDate: '', endDate: '', isCurrent: false, order: 0,
};

const toISODate = (v: string) => (v ? new Date(v).toISOString() : undefined);
const toInputDate = (v?: string | null) => (v ? v.slice(0, 10) : '');

export default function EducationPage() {
  const [items, setItems] = useState<Education[]>([]);
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
      setItems(await educationService.getAll());
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger les formations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(null); setModalOpen(true); };

  const openEdit = (edu: Education) => {
    setEditingId(edu.id);
    setForm({
      degreeFr: edu.degree?.fr ?? '',
      school: edu.school,
      location: edu.location ?? '',
      startDate: toInputDate(edu.startDate),
      endDate: toInputDate(edu.endDate),
      isCurrent: edu.isCurrent,
      order: edu.order,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload: EducationFormInput = {
      degree: { fr: form.degreeFr.trim(), en: form.degreeFr.trim() },
      school: form.school.trim(),
      location: form.location.trim() || undefined,
      startDate: toISODate(form.startDate)!,
      endDate: form.isCurrent ? null : toISODate(form.endDate) ?? null,
      isCurrent: form.isCurrent,
      order: form.order,
    };

    try {
      if (editingId) await educationService.update(editingId, payload);
      else await educationService.create(payload);
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Impossible d'enregistrer la formation."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (edu: Education) => {
    if (!window.confirm(`Supprimer « ${edu.degree?.fr ?? edu.school} » ?`)) return;
    try { await educationService.delete(edu.id); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Suppression impossible.')); }
  };

  const period = (edu: Education) => {
    const start = new Date(edu.startDate).getFullYear();
    if (edu.isCurrent) return `${start} – aujourd'hui`;
    if (!edu.endDate) return String(start);
    const end = new Date(edu.endDate).getFullYear();
    return start === end ? String(start) : `${start} – ${end}`;
  };

  return (
    <AdminShell
      title="Formation"
      subtitle="Diplômes et parcours académique. Alimente la section Formation de ton CV."
      actions={
        <button onClick={openCreate} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-2 rounded-lg text-sm">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Ajouter</span>
        </button>
      }
    >
      {error && (
        <div className="flex gap-2 p-3 text-sm rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-slate-500 dark:text-slate-400">Aucune formation enregistrée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((edu) => (
            <article key={edu.id} className="flex items-start gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{edu.degree?.fr}</h3>
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                  {edu.school}{edu.location ? `, ${edu.location}` : ''}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{period(edu)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(edu)} className="p-2 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Modifier"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(edu)} className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingId ? 'Modifier la formation' : 'Nouvelle formation'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 p-1"><X className="h-5 w-5" /></button>
            </div>

            {formError && (
              <div className="flex gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span className="whitespace-pre-line">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Diplôme *</label>
                <input required value={form.degreeFr} onChange={(e) => setForm({ ...form, degreeFr: e.target.value })} placeholder="Master professionnel en sécurité informatique et réseaux" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Établissement *</label>
                  <input required value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="IUB" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Ville</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Dschang" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Début *</label>
                  <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Fin</label>
                  <input type="date" disabled={form.isCurrent} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`${inputClass} disabled:opacity-50`} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked, endDate: e.target.checked ? '' : form.endDate })} className="accent-indigo-600 h-4 w-4" />
                Formation en cours
              </label>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">Annuler</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-60">
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
