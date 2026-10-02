"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

import AdminShell from '@/components/admin/admin-shell';
import {
  configService,
  DEFAULT_CONFIG,
  type ConfigInput,
  type GlobalConfig,
  type ThemeMode,
} from '@/services/config.service';
import { getErrorMessage } from '@/lib/api';

/**
 * Configuration du site public.
 *
 * Séparée de l'écran Paramètres, qui gère le profil : « qui je suis » et
 * « comment le site se comporte » ne se modifient ni au même moment ni pour
 * les mêmes raisons. Le profil alimente le CV et la lettre de motivation,
 * cette page pilote l'apparence et le référencement.
 */

const input =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const area = `${input} leading-6`;
const label = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5';
const hint = 'mt-1 text-xs text-slate-400';
const card =
  'rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';

/** Réseaux proposés d'office. La liste reste ouverte, c'est juste un raccourci. */
const KNOWN_NETWORKS = [
  'github',
  'linkedin',
  'twitter',
  'whatsapp',
  'telegram',
  'youtube',
  'instagram',
  'facebook',
];

/** Sections de la page d'accueil, dans l'ordre où elles peuvent apparaître. */
const SECTION_LABELS: Record<string, string> = {
  hero: 'En-tête',
  about: 'À propos',
  projects: 'Projets',
  skills: 'Compétences',
  experience: 'Parcours',
  education: 'Formation',
  contact: 'Contact',
};

const HEX = /^#[0-9a-fA-F]{6}$/;

interface SocialRow {
  key: string;
  value: string;
}

export default function SiteConfigPage() {
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [social, setSocial] = useState<SocialRow[]>([]);
  const [keywords, setKeywords] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await configService.get();
      setConfig(data);
      setSocial(Object.entries(data.socialLinks).map(([key, value]) => ({ key, value })));
      setKeywords(data.seoConfig.keywords.join('\n'));
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger la configuration.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = <K extends keyof GlobalConfig>(key: K, value: GlobalConfig[K]) =>
    setConfig((current) => (current ? { ...current, [key]: value } : current));

  const patchTheme = (partial: Partial<GlobalConfig['themeConfig']>) =>
    setConfig((current) =>
      current ? { ...current, themeConfig: { ...current.themeConfig, ...partial } } : current
    );

  const patchSeo = (partial: Partial<GlobalConfig['seoConfig']>) =>
    setConfig((current) =>
      current ? { ...current, seoConfig: { ...current.seoConfig, ...partial } } : current
    );

  /* ---------------- Ordre des sections ---------------- */

  const moveSection = (index: number, direction: -1 | 1) =>
    setConfig((current) => {
      if (!current) return current;

      const target = index + direction;
      if (target < 0 || target >= current.sectionOrder.length) return current;

      const order = [...current.sectionOrder];
      const moved = order[index] as string;
      order[index] = order[target] as string;
      order[target] = moved;
      return { ...current, sectionOrder: order };
    });

  /* ---------------- Enregistrement ---------------- */

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!config) return;

    setError(null);
    setSaved(false);

    // Le serveur refuse toute couleur qui n'est pas au format #rrggbb.
    // Autant le dire ici, avec le nom du champ fautif.
    if (!HEX.test(config.themeConfig.primaryColor)) {
      setError('La couleur principale doit être au format #rrggbb, par exemple #12263A.');
      return;
    }
    if (!HEX.test(config.themeConfig.accentColor)) {
      setError("La couleur d'accent doit être au format #rrggbb, par exemple #0E8A68.");
      return;
    }

    if (config.languages.length === 0) {
      setError('Garde au moins une langue activée.');
      return;
    }

    /*
     * Les liens sont nettoyés avant l'envoi : une clé vide ou une adresse
     * vide produirait une entrée fantôme dans le pied de page public.
     * On normalise aussi la clé en minuscules, pour que « GitHub » et
     * « github » ne créent pas deux entrées distinctes.
     */
    const socialLinks = Object.fromEntries(
      social
        .filter((row) => row.key.trim() && row.value.trim())
        .map((row) => [row.key.trim().toLowerCase(), row.value.trim()])
    );

    setSaving(true);

    const payload: ConfigInput = {
      siteName: config.siteName.trim(),
      isAvailable: config.isAvailable,
      freelanceStatus: config.freelanceStatus?.trim() || null,
      themeConfig: config.themeConfig,
      seoConfig: {
        ...config.seoConfig,
        keywords: keywords
          .split('\n')
          .map((k) => k.trim())
          .filter(Boolean),
      },
      socialLinks,
      languages: config.languages,
      sectionOrder: config.sectionOrder,
    };

    try {
      await configService.save(payload);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      setError(getErrorMessage(err, "L'enregistrement a échoué."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Site">
        <div className="flex justify-center p-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      </AdminShell>
    );
  }

  if (!config) {
    return (
      <AdminShell title="Site">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error ?? 'Configuration introuvable.'}
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Site"
      subtitle="Apparence, référencement et liens publics. Modifiable sans redéployer."
    >
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6" noValidate>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="whitespace-pre-line">{error}</span>
          </div>
        )}

        {saved && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Configuration enregistrée. Le site public met jusqu&apos;à une minute à la refléter,
              le temps que son cache expire.
            </span>
          </div>
        )}

        {/* ---------------- Identité ---------------- */}
        <section className={card}>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Identité</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="siteName" className={label}>
                Nom du site
              </label>
              <input
                id="siteName"
                className={input}
                value={config.siteName}
                onChange={(e) => patch('siteName', e.target.value)}
              />
              <p className={hint}>
                Utilisé dans les aperçus de partage sur LinkedIn et WhatsApp.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                checked={config.isAvailable}
                onChange={(e) => patch('isAvailable', e.target.checked)}
              />
              Afficher le badge de disponibilité en haut de la page d&apos;accueil
            </label>

            <div>
              <label htmlFor="freelanceStatus" className={label}>
                Texte du badge
              </label>
              <input
                id="freelanceStatus"
                className={input}
                disabled={!config.isAvailable}
                value={config.freelanceStatus ?? ''}
                onChange={(e) => patch('freelanceStatus', e.target.value)}
                placeholder="Disponible pour un poste ou une mission"
              />
              <p className={hint}>
                Écris une phrase qui dit ce que tu cherches. « Disponible » tout seul laisse le
                visiteur deviner.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------- Référencement ---------------- */}
        <section className={card}>
          <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Référencement</h2>
          <p className="mb-4 text-xs text-slate-400">
            Ce que Google affiche dans ses résultats, et ce qui apparaît quand on partage ton lien.
          </p>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="titleFr" className={label}>
                  Titre, français
                </label>
                <input
                  id="titleFr"
                  maxLength={70}
                  className={input}
                  value={config.seoConfig.title.fr}
                  onChange={(e) =>
                    patchSeo({ title: { ...config.seoConfig.title, fr: e.target.value } })
                  }
                />
                <p className={hint}>{config.seoConfig.title.fr.length} / 70 caractères</p>
              </div>

              <div>
                <label htmlFor="titleEn" className={label}>
                  Titre, anglais
                </label>
                <input
                  id="titleEn"
                  maxLength={70}
                  className={input}
                  value={config.seoConfig.title.en}
                  onChange={(e) =>
                    patchSeo({ title: { ...config.seoConfig.title, en: e.target.value } })
                  }
                />
                <p className={hint}>{config.seoConfig.title.en.length} / 70 caractères</p>
              </div>
            </div>

            <p className={hint}>
              Google coupe au-delà de 60 caractères environ. Mets ton nom et ton métier en premier,
              pas le mot « Portfolio ».
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="descFr" className={label}>
                  Description, français
                </label>
                <textarea
                  id="descFr"
                  rows={3}
                  maxLength={180}
                  className={area}
                  value={config.seoConfig.description.fr}
                  onChange={(e) =>
                    patchSeo({
                      description: { ...config.seoConfig.description, fr: e.target.value },
                    })
                  }
                />
                <p className={hint}>{config.seoConfig.description.fr.length} / 180 caractères</p>
              </div>

              <div>
                <label htmlFor="descEn" className={label}>
                  Description, anglais
                </label>
                <textarea
                  id="descEn"
                  rows={3}
                  maxLength={180}
                  className={area}
                  value={config.seoConfig.description.en}
                  onChange={(e) =>
                    patchSeo({
                      description: { ...config.seoConfig.description, en: e.target.value },
                    })
                  }
                />
                <p className={hint}>{config.seoConfig.description.en.length} / 180 caractères</p>
              </div>
            </div>

            <div>
              <label htmlFor="keywords" className={label}>
                Mots-clés
              </label>
              <textarea
                id="keywords"
                rows={4}
                className={area}
                placeholder={'Un par ligne\ndéveloppeur full stack\nsécurité des systèmes d\'information'}
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <p className={hint}>
                Google ne s&apos;en sert plus depuis longtemps pour classer les pages. Ça reste
                lu par d&apos;autres moteurs, mais n&apos;y passe pas ton après-midi.
              </p>
            </div>

            <div>
              <label htmlFor="ogImage" className={label}>
                Image de partage
              </label>
              <input
                id="ogImage"
                className={input}
                placeholder="https://... ou /uploads/..."
                value={config.seoConfig.ogImage}
                onChange={(e) => patchSeo({ ogImage: e.target.value })}
              />
              <p className={hint}>
                1200 x 630 pixels. C&apos;est la vignette affichée quand quelqu&apos;un colle ton
                lien dans une conversation.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------- Liens publics ---------------- */}
        <section className={card}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Liens publics</h2>
            <button
              type="button"
              onClick={() => setSocial((rows) => [...rows, { key: '', value: '' }])}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
          </div>

          {social.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-400 dark:border-slate-700">
              Aucun lien. Le pied de page du site restera vide tant que tu n&apos;en ajoutes pas.
            </p>
          ) : (
            <div className="space-y-2">
              {social.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    className={`${input} w-40 shrink-0`}
                    list="reseaux"
                    placeholder="github"
                    value={row.key}
                    onChange={(e) =>
                      setSocial((rows) =>
                        rows.map((r, i) => (i === index ? { ...r, key: e.target.value } : r))
                      )
                    }
                  />
                  <input
                    className={input}
                    placeholder="https://github.com/..."
                    value={row.value}
                    onChange={(e) =>
                      setSocial((rows) =>
                        rows.map((r, i) => (i === index ? { ...r, value: e.target.value } : r))
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setSocial((rows) => rows.filter((_, i) => i !== index))}
                    className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <datalist id="reseaux">
                {KNOWN_NETWORKS.map((network) => (
                  <option key={network} value={network} />
                ))}
              </datalist>
            </div>
          )}

          <p className={hint}>
            Les lignes incomplètes sont ignorées à l&apos;enregistrement. L&apos;intitulé est mis
            en minuscules, pour que « GitHub » et « github » ne fassent pas deux entrées.
          </p>
        </section>

        {/* ---------------- Apparence ---------------- */}
        <section className={card}>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Apparence</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="primaryColor" className={label}>
                Couleur principale
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  aria-label="Sélecteur de couleur principale"
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-transparent dark:border-slate-700"
                  value={HEX.test(config.themeConfig.primaryColor) ? config.themeConfig.primaryColor : '#12263A'}
                  onChange={(e) => patchTheme({ primaryColor: e.target.value })}
                />
                <input
                  id="primaryColor"
                  className={`${input} font-mono`}
                  value={config.themeConfig.primaryColor}
                  onChange={(e) => patchTheme({ primaryColor: e.target.value })}
                />
              </div>
              <p className={hint}>Texte et titres. Doit rester très sombre.</p>
            </div>

            <div>
              <label htmlFor="accentColor" className={label}>
                Couleur d&apos;accent
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  aria-label="Sélecteur de couleur d'accent"
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-transparent dark:border-slate-700"
                  value={HEX.test(config.themeConfig.accentColor) ? config.themeConfig.accentColor : '#0E8A68'}
                  onChange={(e) => patchTheme({ accentColor: e.target.value })}
                />
                <input
                  id="accentColor"
                  className={`${input} font-mono`}
                  value={config.themeConfig.accentColor}
                  onChange={(e) => patchTheme({ accentColor: e.target.value })}
                />
              </div>
              <p className={hint}>
                Liens et badges. Évite les tons clairs : ils deviennent illisibles sur fond blanc.
              </p>
            </div>

            <div>
              <label htmlFor="defaultMode" className={label}>
                Thème par défaut
              </label>
              <select
                id="defaultMode"
                className={input}
                value={config.themeConfig.defaultMode}
                onChange={(e) => patchTheme({ defaultMode: e.target.value as ThemeMode })}
              >
                <option value="system">Suivre le réglage du visiteur</option>
                <option value="light">Clair</option>
                <option value="dark">Sombre</option>
              </select>
              <p className={hint}>
                « Suivre le réglage » est le choix le plus sûr : le visiteur garde la main.
              </p>
            </div>

            <div className="flex items-end">
              <div className="w-full rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-xs text-slate-400">Aperçu</p>
                <div className="flex items-center gap-3">
                  <span
                    className="rounded px-2 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: config.themeConfig.primaryColor }}
                  >
                    Titre
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: config.themeConfig.accentColor }}
                  >
                    Un lien
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Langues et sections ---------------- */}
        <section className={card}>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
            Langues et sections
          </h2>

          <div className="space-y-5">
            <div>
              <p className={label}>Langues publiées</p>
              <div className="flex gap-4">
                {(['fr', 'en'] as const).map((lang) => (
                  <label
                    key={lang}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      checked={config.languages.includes(lang)}
                      onChange={(e) =>
                        patch(
                          'languages',
                          e.target.checked
                            ? [...config.languages, lang]
                            : config.languages.filter((l) => l !== lang)
                        )
                      }
                    />
                    {lang === 'fr' ? 'Français' : 'Anglais'}
                  </label>
                ))}
              </div>
              <p className={hint}>
                Le site public n&apos;affiche que le français pour l&apos;instant. Ce réglage
                prépare le sélecteur de langue, il ne le remplace pas.
              </p>
            </div>

            <div>
              <p className={label}>Ordre des sections</p>
              <ul className="space-y-1.5">
                {config.sectionOrder.map((section, index) => (
                  <li
                    key={section}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                  >
                    <span className="font-mono text-xs text-slate-400">{index + 1}</span>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                      {SECTION_LABELS[section] ?? section}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveSection(index, -1)}
                      disabled={index === 0}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, 1)}
                      disabled={index === config.sectionOrder.length - 1}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className={hint}>
                Enregistré en base, mais pas encore lu par la page d&apos;accueil, qui garde un
                ordre fixe. Je préfère te le dire plutôt que te laisser croire que ça agit.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>

          <button
            type="button"
            onClick={() => {
              patch('themeConfig', DEFAULT_CONFIG.themeConfig);
            }}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Rétablir les couleurs d&apos;origine
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
