"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, AlertCircle, X } from 'lucide-react';

import AdminShell from '@/components/admin/admin-shell';
import { skillService, type SkillFormInput } from '@/services/skill.service';
import { getErrorMessage } from '@/lib/api';
import { SKILL_CATEGORY_LABELS, type Skill, type SkillCategory } from '@/types/api';

const CATEGORIES = Object.keys(SKILL_CATEGORY_LABELS) as SkillCategory[];

const emptyForm: SkillFormInput = {
  name: '',
  category: 'FRONTEND',
  level: 70,
  yearsOfExp: 1,
  order: 0,
};

const inputClass =
  'mt-1 w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SkillFormInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSkills(await skillService.getAll());
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger les compétences.'));
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

  const openEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setForm({
      name: skill.name,
      category: skill.category,
      level: skill.level,
      yearsOfExp: skill.yearsOfExp,
      order: skill.order,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      if (editingId) await skillService.update(editingId, form);
      else await skillService.create(form);

      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Impossible d'enregistrer la compétence."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (skill: Skill) => {
    if (!window.confirm(`Supprimer la compétence « ${skill.name} » ?`)) return;

    try {
      await skillService.delete(skill.id);
      await load();
    } catch (err) {
      // Le backend refuse la suppression si la compétence est encore liée à
      // des projets : on affiche son message plutôt qu'une erreur générique.
      setError(getErrorMessage(err, 'Suppression impossible.'));
    }
  };

  // Regroupement par catégorie pour un affichage lisible.
  const grouped = CATEGORIES.map((category) => ({
    category,
    items: skills.filter((s) => s.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <AdminShell
      title="Compétences"
      subtitle="Elles alimentent le portfolio public, les projets et la section Compétences de ton CV."
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
      ) : skills.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            Aucune compétence enregistrée. Ajoute-en une pour pouvoir la rattacher à tes projets.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, items }) => (
            <section
              key={category}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <h2 className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                {SKILL_CATEGORY_LABELS[category]} · {items.length}
              </h2>

              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((skill) => (
                  <li key={skill.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {skill.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {skill.yearsOfExp} an{skill.yearsOfExp > 1 ? 's' : ''} d&apos;expérience
                      </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 w-40">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${skill.level}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-slate-500 w-8 text-right">
                        {skill.level}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(skill)}
                        className="p-2 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label={`Modifier ${skill.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(skill)}
                        className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label={`Supprimer ${skill.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingId ? 'Modifier la compétence' : 'Nouvelle compétence'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
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
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Nom *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ex: React.js"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Catégorie *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as SkillCategory })}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {SKILL_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Niveau : {form.level}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                  className="mt-2 w-full accent-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Années d&apos;expérience
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={form.yearsOfExp}
                    onChange={(e) => setForm({ ...form, yearsOfExp: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Ordre d&apos;affichage
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.order ?? 0}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-60"
                >
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
