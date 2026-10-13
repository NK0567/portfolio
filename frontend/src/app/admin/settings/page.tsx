"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileDown,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';

import AdminShell from '@/components/admin/admin-shell';
import AvatarCropper from '@/components/admin/avatar-cropper';
import { profileService, type ProfileFormInput } from '@/services/profile.service';
import { cvService } from '@/services/cv.service';
import { mediaUrl } from '@/lib/assets';
import { getErrorMessage } from '@/lib/api';

const inputClass =
  'mt-1 w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const areaClass =
  'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const labelClass = 'text-xs font-semibold text-slate-800 dark:text-slate-200';
const hintClass = 'font-normal text-slate-400';
const card = 'bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4';
const cardTitle = 'text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400';

type Lang = 'fr' | 'en';

/** Champs traduisibles : une valeur par langue. */
interface Localized {
  headline: string;
  bio: string;
  titles: string;
  languages: string;
  interests: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneAlt: string;
  location: string;
  birthDate: string;
  fr: Localized;
  en: Localized;
}

const emptyLocalized: Localized = { headline: '', bio: '', titles: '', languages: '', interests: '' };

const empty: FormState = {
  firstName: '', lastName: '', email: '', phone: '', phoneAlt: '', location: '', birthDate: '',
  fr: emptyLocalized,
  en: emptyLocalized,
};

const lines = (value: string) => value.split('\n').map((l) => l.trim()).filter(Boolean);

/** "Français : courant" -> ["Français", "courant"] */
const splitLanguage = (line: string): [string, string] => {
  const index = line.indexOf(':');
  if (index < 0) return [line.trim(), ''];
  return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
};

/**
 * Profil : identité, photo, coordonnées et textes du CV.
 *
 * Chaque texte existe en français ET en anglais. L'ancienne version copiait
 * le français dans l'anglais à chaque enregistrement : le CV anglais était
 * donc en français. Un champ anglais laissé vide reprend le français.
 */
export default function SettingsPage() {
  const [form, setForm] = useState<FormState>(empty);
  const [lang, setLang] = useState<Lang>('fr');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [rawPhoto, setRawPhoto] = useState<File | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewLang, setPreviewLang] = useState<Lang>('fr');
  // Change à chaque enregistrement pour forcer l'iframe à recharger l'aperçu.
  const [previewKey, setPreviewKey] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await profileService.get();
      if (profile) {
        setHasProfile(true);
        setAvatarUrl(profile.avatarUrl);
        const langs = profile.languages ?? [];
        const localized = (l: Lang): Localized => ({
          headline: profile.headline?.[l] ?? '',
          bio: profile.bio?.[l] ?? '',
          titles: (profile.titles?.[l] ?? []).join('\n'),
          interests: (profile.interests?.[l] ?? []).join('\n'),
          languages: langs
            .map((x) =>
              l === 'fr' ? `${x.name} : ${x.level}` : x.nameEn || x.levelEn ? `${x.nameEn ?? ''} : ${x.levelEn ?? ''}` : ''
            )
            .join('\n'),
        });
        setForm({
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          email: profile.email ?? '',
          phone: profile.phone ?? '',
          phoneAlt: profile.phoneAlt ?? '',
          location: profile.location ?? '',
          birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : '',
          fr: localized('fr'),
          en: localized('en'),
        });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger le profil.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const flash = (message: string) => {
    setSuccess(message);
    setPreviewKey((k) => k + 1);
    window.setTimeout(() => setSuccess(null), 4000);
  };

  const setLocalized = (key: keyof Localized, value: string) =>
    setForm((f) => ({ ...f, [lang]: { ...f[lang], [key]: value } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Les langues parlées sont appariées ligne à ligne : la 2e ligne anglaise
    // traduit la 2e ligne française.
    const frLangs = lines(form.fr.languages).map(splitLanguage);
    const enLangs = lines(form.en.languages).map(splitLanguage);
    const languages = frLangs.map(([name, level], i) => ({
      name,
      level: level || 'courant',
      ...(enLangs[i]?.[0] ? { nameEn: enLangs[i]![0] } : {}),
      ...(enLangs[i]?.[1] ? { levelEn: enLangs[i]![1] } : {}),
    }));

    const both = (key: 'headline' | 'bio') => ({ fr: form.fr[key].trim(), en: form.en[key].trim() });
    const bothList = (key: 'titles' | 'interests') => ({ fr: lines(form.fr[key]), en: lines(form.en[key]) });

    const payload: ProfileFormInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      phoneAlt: form.phoneAlt.trim(),
      location: form.location.trim(),
      birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null,
      headline: both('headline'),
      bio: both('bio'),
      titles: bothList('titles'),
      languages,
      interests: bothList('interests'),
    };

    try {
      await profileService.save(payload);
      setHasProfile(true);
      flash("Profil enregistré. L'aperçu du CV a été régénéré.");
    } catch (err) {
      setError(getErrorMessage(err, "Impossible d'enregistrer le profil."));
    } finally {
      setSaving(false);
    }
  };

  /** Photo recadrée : envoyée tout de suite, sans attendre le bouton Enregistrer. */
  const uploadPhoto = async (cropped: File) => {
    setRawPhoto(null);
    if (!hasProfile) {
      setError("Enregistre d'abord ton nom et ton prénom, puis ajoute la photo.");
      return;
    }
    setPhotoBusy(true);
    setError(null);
    try {
      const profile = await profileService.save({ avatar: cropped });
      setAvatarUrl(profile.avatarUrl);
      flash('Photo mise à jour, sur le site comme sur le CV.');
    } catch (err) {
      setError(getErrorMessage(err, "Impossible d'envoyer la photo."));
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!window.confirm('Retirer la photo ? Le CV affichera tes initiales à la place.')) return;
    setPhotoBusy(true);
    setError(null);
    try {
      await profileService.save({ avatarUrl: null });
      setAvatarUrl(null);
      flash('Photo retirée.');
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de retirer la photo.'));
    } finally {
      setPhotoBusy(false);
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

  const current = form[lang];
  const initials = `${form.firstName[0] ?? ''}${form.lastName[0] ?? ''}`.toUpperCase();
  const photo = mediaUrl(avatarUrl);

  return (
    <AdminShell
      title="Paramètres"
      subtitle="Ces informations alimentent le portfolio public, ton CV et tes lettres de motivation."
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
              {success}
            </div>
          )}

          {/* ---------------- Photo ---------------- */}
          <section className={card}>
            <h2 className={cardTitle}>Photo</h2>
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-indigo-200 bg-slate-800 dark:border-indigo-900">
                {photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={photo} alt="Photo de profil" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                    {initials || '?'}
                  </span>
                )}
                {photoBusy && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={photoBusy}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    <Camera className="h-4 w-4" />
                    {photo ? 'Changer la photo' : 'Ajouter une photo'}
                  </button>
                  {photo && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      disabled={photoBusy}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:text-red-600 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Retirer
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Tu pourras la recadrer, zoomer et la faire pivoter avant l&apos;envoi. Utilisée sur le CV.
                </p>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setRawPhoto(file);
                  e.target.value = '';
                }}
              />
            </div>
          </section>

          {/* ---------------- Identité et contact ---------------- */}
          <section className={card}>
            <h2 className={cardTitle}>Identité et contact</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Prénom *</label>
                <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Nom *</label>
                <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>E-mail</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Localisation</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Dschang, Cameroun" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Téléphone secondaire</label>
                <input value={form.phoneAlt} onChange={(e) => setForm({ ...form, phoneAlt: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Date de naissance</label>
                <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={inputClass} />
              </div>
            </div>
          </section>

          {/* ---------------- Textes bilingues ---------------- */}
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={cardTitle}>Textes du CV et du site</h2>
              <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700" role="tablist">
                {(['fr', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="tab"
                    aria-selected={lang === l}
                    onClick={() => setLang(l)}
                    className={[
                      'rounded-md px-3 py-1 text-xs font-semibold',
                      lang === l ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
                    ].join(' ')}
                  >
                    {l === 'fr' ? 'Français' : 'English'}
                  </button>
                ))}
              </div>
            </div>
            {lang === 'en' && (
              <p className="rounded-lg bg-indigo-50 p-2.5 text-xs text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                Version anglaise, utilisée par le CV en anglais. Un champ laissé vide reprend le français.
              </p>
            )}

            <div>
              <label className={labelClass}>Titre professionnel</label>
              <input
                value={current.headline}
                onChange={(e) => setLocalized('headline', e.target.value)}
                placeholder={lang === 'fr' ? 'Développeur Full-Stack Web & Mobile' : 'Full-Stack Web & Mobile Developer'}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Profil <span className={hintClass}>— paragraphe en tête du CV et de la page d&apos;accueil</span>
              </label>
              <textarea rows={5} value={current.bio} onChange={(e) => setLocalized('bio', e.target.value)} className={areaClass} />
            </div>
            <div>
              <label className={labelClass}>
                Titres défilants <span className={hintClass}>— un par ligne, en-tête du site</span>
              </label>
              <textarea rows={3} value={current.titles} onChange={(e) => setLocalized('titles', e.target.value)} className={areaClass} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Langues parlées{' '}
                  <span className={hintClass}>— {lang === 'fr' ? '« Français : courant »' : '« French : native », même ordre'}</span>
                </label>
                <textarea rows={3} value={current.languages} onChange={(e) => setLocalized('languages', e.target.value)} className={areaClass} />
              </div>
              <div>
                <label className={labelClass}>
                  Centres d&apos;intérêt <span className={hintClass}>— un par ligne</span>
                </label>
                <textarea rows={3} value={current.interests} onChange={(e) => setLocalized('interests', e.target.value)} className={areaClass} />
              </div>
            </div>
          </section>

          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </form>

        <aside className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Aperçu du CV</h2>
              <div className="flex rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
                {(['fr', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setPreviewLang(l)}
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${previewLang === l ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPreviewKey((k) => k + 1)} className="p-2 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Rafraîchir">
                <RefreshCw className="h-4 w-4" />
              </button>
              <a href={cvService.downloadUrl(previewLang)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
                <FileDown className="h-3.5 w-3.5" /> PDF
              </a>
            </div>
          </div>

          {/* L'aperçu affiche le PDF réellement servi au visiteur, pas une
              reconstitution HTML : ce que tu vois est ce qui sera téléchargé. */}
          <iframe
            key={`${previewLang}-${previewKey}`}
            src={cvService.previewUrl(previewLang)}
            title="Aperçu du CV"
            className="w-full h-[560px] bg-slate-100 dark:bg-slate-800"
          />
        </aside>
      </div>

      {rawPhoto && (
        <AvatarCropper file={rawPhoto} onCancel={() => setRawPhoto(null)} onConfirm={uploadPhoto} />
      )}
    </AdminShell>
  );
}
