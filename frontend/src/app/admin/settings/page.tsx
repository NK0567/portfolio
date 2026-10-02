"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, AlertCircle, CheckCircle2, FileDown, RefreshCw } from 'lucide-react';

import AdminShell from '@/components/admin/admin-shell';
import { profileService, type ProfileFormInput } from '@/services/profile.service';
import { cvService } from '@/services/cv.service';
import { getErrorMessage } from '@/lib/api';

const inputClass =
  'mt-1 w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const areaClass =
  'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneAlt: string;
  location: string;
  birthDate: string;
  headlineFr: string;
  bioFr: string;
  titlesFr: string;
  languages: string;
  interestsFr: string;
}

const empty: FormState = {
  firstName: '', lastName: '', email: '', phone: '', phoneAlt: '', location: '',
  birthDate: '', headlineFr: '', bioFr: '', titlesFr: '', languages: '', interestsFr: '',
};

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Change à chaque enregistrement pour forcer l'iframe à recharger l'aperçu.
  const [previewKey, setPreviewKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await profileService.get();
      if (profile) {
        setForm({
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          email: profile.email ?? '',
          phone: profile.phone ?? '',
          phoneAlt: profile.phoneAlt ?? '',
          location: profile.location ?? '',
          birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : '',
          headlineFr: profile.headline?.fr ?? '',
          bioFr: profile.bio?.fr ?? '',
          titlesFr: (profile.titles?.fr ?? []).join('\n'),
          languages: (profile.languages ?? []).map((l) => `${l.name} : ${l.level}`).join('\n'),
          interestsFr: (profile.interests?.fr ?? []).join('\n'),
        });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger le profil.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const parseLines = (value: string) =>
    value.split('\n').map((l) => l.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    // "Français : courant" -> { name: "Français", level: "courant" }
    const languages = parseLines(form.languages).map((line) => {
      const [name, level] = line.split(':');
      return { name: (name ?? '').trim(), level: (level ?? '').trim() || 'courant' };
    });

    const payload: ProfileFormInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      phoneAlt: form.phoneAlt.trim(),
      location: form.location.trim(),
      birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null,
      headline: { fr: form.headlineFr.trim(), en: form.headlineFr.trim() },
      bio: { fr: form.bioFr.trim(), en: form.bioFr.trim() },
      titles: { fr: parseLines(form.titlesFr), en: parseLines(form.titlesFr) },
      languages,
      interests: { fr: parseLines(form.interestsFr), en: parseLines(form.interestsFr) },
    };

    try {
      await profileService.save(payload);
      setSuccess(true);
      setPreviewKey((k) => k + 1);
      window.setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(getErrorMessage(err, "Impossible d'enregistrer le profil."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Paramètres">
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Paramètres"
      subtitle="Ces informations alimentent le portfolio public et l'en-tête de ton CV."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_420px] items-start">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex gap-2 p-3 text-sm rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="whitespace-pre-line">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex gap-2 p-3 text-sm rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              Profil enregistré. L&apos;aperçu du CV a été régénéré.
            </div>
          )}

          <section className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Identité
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Prénom *</label>
                <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Nom *</label>
                <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Titre professionnel</label>
              <input value={form.headlineFr} onChange={(e) => setForm({ ...form, headlineFr: e.target.value })} placeholder="Développeur Full-Stack Web & Mobile" className={inputClass} />
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Localisation</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Dschang, Cameroun" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Téléphone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Téléphone secondaire</label>
                <input value={form.phoneAlt} onChange={(e) => setForm({ ...form, phoneAlt: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Date de naissance</label>
                <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={inputClass} />
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contenu</h2>
            <div>
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Profil <span className="font-normal text-slate-400">— paragraphe en tête du CV</span>
              </label>
              <textarea rows={5} value={form.bioFr} onChange={(e) => setForm({ ...form, bioFr: e.target.value })} className={areaClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Titres défilants <span className="font-normal text-slate-400">— un par ligne, page d&apos;accueil</span>
              </label>
              <textarea rows={3} value={form.titlesFr} onChange={(e) => setForm({ ...form, titlesFr: e.target.value })} className={areaClass} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Langues <span className="font-normal text-slate-400">— « Français : courant »</span>
                </label>
                <textarea rows={3} value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} className={areaClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Centres d&apos;intérêt <span className="font-normal text-slate-400">— un par ligne</span>
                </label>
                <textarea rows={3} value={form.interestsFr} onChange={(e) => setForm({ ...form, interestsFr: e.target.value })} className={areaClass} />
              </div>
            </div>
          </section>

          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </form>

        <aside className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden lg:sticky lg:top-6">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Aperçu du CV</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setPreviewKey((k) => k + 1)} className="p-2 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Rafraîchir">
                <RefreshCw className="h-4 w-4" />
              </button>
              <a href={cvService.downloadUrl('fr')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
                <FileDown className="h-3.5 w-3.5" /> PDF
              </a>
            </div>
          </div>

          {/* L'aperçu affiche le PDF réellement servi au visiteur, pas une
              reconstitution HTML : ce que tu vois est ce qui sera téléchargé. */}
          <iframe
            key={previewKey}
            src={cvService.previewUrl('fr')}
            title="Aperçu du CV"
            className="w-full h-[560px] bg-slate-100 dark:bg-slate-800"
          />
        </aside>
      </div>
    </AdminShell>
  );
}
