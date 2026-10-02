"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { projectService, type ProjectFormInput } from '@/services/project.service';
import { skillService } from '@/services/skill.service';
import { uploadService } from '@/services/upload.service';
import { mediaUrl } from '@/lib/assets';
import { getErrorMessage } from '@/lib/api';
import type { Project, ProjectStatus, Skill } from '@/types/api';
import { PROJECT_STATUS_LABELS } from '@/types/api';

/**
 * Création et modification d'un projet, dans une seule modale.
 *
 * Elle remplace create-project-modal.tsx et EditProjectModal.tsx. Deux
 * fichiers distincts pour le même formulaire, c'était deux endroits à
 * modifier à chaque ajout de champ, et donc la garantie qu'ils finiraient par
 * diverger. C'est d'ailleurs ce qui s'était produit : la modale d'édition ne
 * proposait pas les mêmes champs que celle de création.
 *
 * Elle couvre maintenant les quinze champs du schéma serveur, dont les cinq
 * qui alimentent la page publique du projet et qui n'avaient jamais été
 * saisissables : contenu détaillé, fonctionnalités, difficultés,
 * architecture, galerie.
 */

const input =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';
const area = `${input} leading-6`;
const label = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5';
const hint = 'mt-1 text-xs text-slate-400';

type Tab = 'base' | 'contenu' | 'medias' | 'technique';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'base', label: 'Essentiel' },
  { id: 'contenu', label: 'Contenu' },
  { id: 'medias', label: 'Médias' },
  { id: 'technique', label: 'Technique' },
];

const STATUSES: ProjectStatus[] = ['DEVELOPMENT', 'COMPLETED', 'MAINTENANCE', 'ARCHIVED'];

interface ArchitectureRow {
  key: string;
  value: string;
}

interface FormState {
  title: string;
  descriptionFr: string;
  descriptionEn: string;
  contentFr: string;
  contentEn: string;
  featuresFr: string;
  featuresEn: string;
  challengesFr: string;
  challengesEn: string;
  documentation: string;
  githubUrl: string;
  demoUrl: string;
  videoUrl: string;
  status: ProjectStatus;
  date: string;
  order: number;
}

const EMPTY: FormState = {
  title: '',
  descriptionFr: '',
  descriptionEn: '',
  contentFr: '',
  contentEn: '',
  featuresFr: '',
  featuresEn: '',
  challengesFr: '',
  challengesEn: '',
  documentation: '',
  githubUrl: '',
  demoUrl: '',
  videoUrl: '',
  status: 'DEVELOPMENT',
  date: new Date().toISOString().slice(0, 10),
  order: 0,
};

const lines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** null pour une création, le projet à modifier sinon. */
  project: Project | null;
}

export default function ProjectFormModal({ isOpen, onClose, onSaved, project }: Props) {
  const isEdit = project !== null;

  const [tab, setTab] = useState<Tab>('base');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [architecture, setArchitecture] = useState<ArchitectureRow[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [existingCover, setExistingCover] = useState<string>('');

  const [skills, setSkills] = useState<Skill[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- Préremplissage ---------------- */

  const hydrate = useCallback(() => {
    setTab('base');
    setError(null);
    setCoverFile(null);
    setCoverPreview(null);

    if (!project) {
      setForm(EMPTY);
      setArchitecture([]);
      setSkillIds([]);
      setGallery([]);
      setExistingCover('');
      return;
    }

    setForm({
      title: project.title ?? '',
      descriptionFr: project.description?.fr ?? '',
      descriptionEn: project.description?.en ?? '',
      contentFr: project.content?.fr ?? '',
      contentEn: project.content?.en ?? '',
      featuresFr: (project.features?.fr ?? []).join('\n'),
      featuresEn: (project.features?.en ?? []).join('\n'),
      challengesFr: project.challenges?.fr ?? '',
      challengesEn: project.challenges?.en ?? '',
      documentation: project.documentation ?? '',
      githubUrl: project.githubUrl ?? '',
      demoUrl: project.demoUrl ?? '',
      videoUrl: project.videoUrl ?? '',
      status: project.status ?? 'DEVELOPMENT',
      date: project.date ? project.date.slice(0, 10) : EMPTY.date,
      order: project.order ?? 0,
    });

    /*
     * `architecture` est un champ JSON libre : il peut contenir n'importe
     * quoi, y compris des objets imbriqués saisis depuis un autre outil. On
     * ne garde que les valeurs convertibles en texte plutôt que de laisser
     * « [object Object] » s'afficher dans un champ.
     */
    setArchitecture(
      Object.entries(project.architecture ?? {})
        .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
        .map(([key, value]) => ({ key, value: String(value) }))
    );

    setSkillIds((project.skills ?? []).map((skill) => skill.id));
    setGallery(Array.isArray(project.images) ? project.images : []);
    setExistingCover(project.mainImage ?? '');
  }, [project]);

  useEffect(() => {
    if (isOpen) hydrate();
  }, [isOpen, hydrate]);

  useEffect(() => {
    if (!isOpen) return;

    skillService
      .getAll()
      .then(setSkills)
      .catch(() => setSkills([]));
  }, [isOpen]);

  /* Libération de l'aperçu local : sans ça, chaque image choisie laisse une
   * référence en mémoire jusqu'au rechargement de la page. */
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  /* Fermeture au clavier, attendue sur toute boîte de dialogue. */
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving && !uploading) onClose();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, saving, uploading, onClose]);

  /* ---------------- Compétences ---------------- */

  const skillsByCategory = useMemo(() => {
    const grouped = new Map<string, Skill[]>();
    for (const skill of skills) {
      grouped.set(skill.category, [...(grouped.get(skill.category) ?? []), skill]);
    }
    return [...grouped.entries()];
  }, [skills]);

  const toggleSkill = (id: string) =>
    setSkillIds((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id]
    );

  /* ---------------- Images ---------------- */

  const handleCoverChange = (file: File | null) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);

    if (!file) {
      setCoverFile(null);
      setCoverPreview(null);
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setError(null);
  };

  /**
   * Les captures montent une par une, au moment du choix.
   *
   * Elles existent donc sur le serveur avant l'enregistrement du projet. Si
   * la validation échoue ensuite sur un autre champ, les images restent en
   * place et il n'y a rien à recommencer. Le prix de ce confort est un
   * fichier orphelin quand on abandonne le formulaire, ce qui est très
   * largement préférable à l'inverse.
   */
  const handleGalleryAdd = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    const added: string[] = [];
    const failed: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const uploaded = await uploadService.image(file);
        added.push(uploaded.path);
      } catch (err) {
        failed.push(`${file.name} : ${getErrorMessage(err, 'envoi refusé')}`);
      }
    }

    if (added.length > 0) setGallery((current) => [...current, ...added]);

    // Un échec partiel se dit : sans message, l'utilisateur croit que les
    // sept images sont passées alors que cinq seulement sont arrivées.
    if (failed.length > 0) setError(failed.join('\n'));

    setUploading(false);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleGalleryRemove = (path: string) => {
    setGallery((current) => current.filter((item) => item !== path));
    // Nettoyage opportuniste du disque. Un échec reste sans conséquence.
    void uploadService.remove(path).catch(() => undefined);
  };

  /* ---------------- Architecture ---------------- */

  const addArchitectureRow = () =>
    setArchitecture((current) => [...current, { key: '', value: '' }]);

  const patchArchitectureRow = (index: number, patch: Partial<ArchitectureRow>) =>
    setArchitecture((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );

  const removeArchitectureRow = (index: number) =>
    setArchitecture((current) => current.filter((_, i) => i !== index));

  /* ---------------- Enregistrement ---------------- */

  const validate = (): string | null => {
    if (form.title.trim().length < 3) return 'Le titre est obligatoire (3 caractères minimum).';

    // Le schéma serveur exige les DEUX langues sur la description.
    if (!form.descriptionFr.trim() || !form.descriptionEn.trim()) {
      return 'La description est obligatoire en français ET en anglais. Le serveur refuse une seule des deux.';
    }

    if (!form.date) return 'La date du projet est obligatoire.';

    if (!isEdit && !coverFile && !existingCover.trim()) {
      return "Une image de couverture est obligatoire à la création. Choisis un fichier ou colle une URL d'image.";
    }

    const emptyKey = architecture.some((row) => !row.key.trim() && row.value.trim());
    if (emptyKey) return 'Une ligne d\'architecture a une valeur sans intitulé.';

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const problem = validate();
    if (problem) {
      setError(problem);
      // On ramène sur l'onglet qui contient le champ fautif, sinon le message
      // parle d'un champ que l'utilisateur ne voit pas.
      setTab(problem.includes('architecture') ? 'technique' : 'base');
      return;
    }

    setSaving(true);
    setError(null);

    const architectureObject = Object.fromEntries(
      architecture
        .filter((row) => row.key.trim())
        .map((row) => [row.key.trim(), row.value.trim()])
    );

    const payload: ProjectFormInput = {
      title: form.title.trim(),
      description: { fr: form.descriptionFr.trim(), en: form.descriptionEn.trim() },
      content: { fr: form.contentFr.trim(), en: form.contentEn.trim() },
      features: { fr: lines(form.featuresFr), en: lines(form.featuresEn) },
      challenges: { fr: form.challengesFr.trim(), en: form.challengesEn.trim() },
      architecture: architectureObject,
      images: gallery,
      documentation: form.documentation.trim() || undefined,
      githubUrl: form.githubUrl.trim() || undefined,
      demoUrl: form.demoUrl.trim() || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      status: form.status,
      date: form.date,
      order: form.order,
      skillIds,
      ...(coverFile ? { coverImage: coverFile } : {}),
      ...(!coverFile && existingCover.trim() ? { mainImage: existingCover.trim() } : {}),
    };

    try {
      if (isEdit && project) await projectService.update(project.id, payload);
      else await projectService.create(payload);

      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "L'enregistrement a échoué."));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Modifier le projet' : 'Nouveau projet'}
    >
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isEdit ? 'Modifier le projet' : 'Nouveau projet'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Ce que tu remplis ici alimente la page publique du projet et ton CV.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-6 pt-3 dark:border-slate-800">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                'whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition-colors',
                tab === item.id
                  ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <form onSubmit={handleSubmit} className="space-y-5 p-6" noValidate>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* ---------------- Essentiel ---------------- */}
          {tab === 'base' && (
            <div className="space-y-5">
              <div>
                <label htmlFor="title" className={label}>
                  Titre
                </label>
                <input
                  id="title"
                  className={input}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                {isEdit && project && (
                  <p className={hint}>
                    Adresse publique : /projects/{project.slug}. Elle ne change pas quand tu
                    modifies le titre, pour ne pas casser les liens déjà partagés.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="descFr" className={label}>
                    Description courte, français
                  </label>
                  <textarea
                    id="descFr"
                    rows={3}
                    className={area}
                    value={form.descriptionFr}
                    onChange={(e) => setForm({ ...form, descriptionFr: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="descEn" className={label}>
                    Description courte, anglais
                  </label>
                  <textarea
                    id="descEn"
                    rows={3}
                    className={area}
                    value={form.descriptionEn}
                    onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                  />
                </div>
              </div>

              <p className={hint}>
                Les deux langues sont obligatoires sur ce champ. C&apos;est une règle du schéma
                serveur, pas du formulaire.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="status" className={label}>
                    Statut
                  </label>
                  <select
                    id="status"
                    className={input}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {PROJECT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="date" className={label}>
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    className={input}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="order" className={label}>
                    Ordre d&apos;affichage
                  </label>
                  <input
                    id="order"
                    type="number"
                    min={0}
                    className={input}
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })}
                  />
                  <p className={hint}>0 en premier</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="githubUrl" className={label}>
                    Dépôt GitHub
                  </label>
                  <input
                    id="githubUrl"
                    className={input}
                    placeholder="https://github.com/..."
                    value={form.githubUrl}
                    onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="demoUrl" className={label}>
                    Démonstration en ligne
                  </label>
                  <input
                    id="demoUrl"
                    className={input}
                    placeholder="https://..."
                    value={form.demoUrl}
                    onChange={(e) => setForm({ ...form, demoUrl: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ---------------- Contenu ---------------- */}
          {tab === 'contenu' && (
            <div className="space-y-5">
              <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/50">
                C&apos;est cette page qui te distingue d&apos;un portfolio à vignettes. Les
                captures d&apos;écran, tout le monde en a. L&apos;architecture retenue, ce qui a
                résisté et ce que ça a donné, presque personne ne l&apos;écrit.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contentFr" className={label}>
                    Récit détaillé, français
                  </label>
                  <textarea
                    id="contentFr"
                    rows={8}
                    className={area}
                    placeholder="Le contexte, le besoin, ce que tu as construit."
                    value={form.contentFr}
                    onChange={(e) => setForm({ ...form, contentFr: e.target.value })}
                  />
                  <p className={hint}>Une ligne vide entre deux paragraphes les sépare à l&apos;affichage.</p>
                </div>

                <div>
                  <label htmlFor="contentEn" className={label}>
                    Récit détaillé, anglais
                  </label>
                  <textarea
                    id="contentEn"
                    rows={8}
                    className={area}
                    value={form.contentEn}
                    onChange={(e) => setForm({ ...form, contentEn: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="featFr" className={label}>
                    Fonctionnalités, français
                  </label>
                  <textarea
                    id="featFr"
                    rows={6}
                    className={area}
                    placeholder={'Une fonctionnalité par ligne\nAuthentification à deux facteurs\nExport PDF des rapports'}
                    value={form.featuresFr}
                    onChange={(e) => setForm({ ...form, featuresFr: e.target.value })}
                  />
                  <p className={hint}>{lines(form.featuresFr).length} fonctionnalité(s)</p>
                </div>

                <div>
                  <label htmlFor="featEn" className={label}>
                    Fonctionnalités, anglais
                  </label>
                  <textarea
                    id="featEn"
                    rows={6}
                    className={area}
                    value={form.featuresEn}
                    onChange={(e) => setForm({ ...form, featuresEn: e.target.value })}
                  />
                  <p className={hint}>{lines(form.featuresEn).length} fonctionnalité(s)</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="chalFr" className={label}>
                    Difficultés et solutions, français
                  </label>
                  <textarea
                    id="chalFr"
                    rows={6}
                    className={area}
                    placeholder="Le problème rencontré, pourquoi la solution évidente ne marchait pas, ce que tu as fait."
                    value={form.challengesFr}
                    onChange={(e) => setForm({ ...form, challengesFr: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="chalEn" className={label}>
                    Difficultés et solutions, anglais
                  </label>
                  <textarea
                    id="chalEn"
                    rows={6}
                    className={area}
                    value={form.challengesEn}
                    onChange={(e) => setForm({ ...form, challengesEn: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ---------------- Médias ---------------- */}
          {tab === 'medias' && (
            <div className="space-y-6">
              <div>
                <p className={label}>Image de couverture</p>

                <div className="flex flex-wrap items-start gap-4">
                  <div className="h-32 w-48 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    {coverPreview || existingCover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={coverPreview ?? mediaUrl(existingCover) ?? ''}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        Aucune image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
                    />

                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Upload className="h-4 w-4" />
                      Choisir un fichier
                    </button>

                    <div>
                      <label htmlFor="mainImage" className={label}>
                        Ou coller une URL
                      </label>
                      <input
                        id="mainImage"
                        className={input}
                        placeholder="https://... ou /uploads/..."
                        value={existingCover}
                        onChange={(e) => setExistingCover(e.target.value)}
                        disabled={coverFile !== null}
                      />
                      <p className={hint}>
                        {coverFile
                          ? 'Le fichier choisi remplace cette URL.'
                          : 'JPEG, PNG, WebP, AVIF ou GIF. 5 Mo maximum.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className={label}>Galerie</p>
                  <span className="text-xs text-slate-400">{gallery.length} image(s)</span>
                </div>

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleGalleryAdd(e.target.files)}
                />

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {gallery.map((path) => (
                    <div
                      key={path}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaUrl(path) ?? ''}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleGalleryRemove(path)}
                        className="absolute right-1.5 top-1.5 rounded-md bg-slate-900/70 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                        title="Retirer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploading}
                    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-50 dark:border-slate-700"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                    <span className="text-xs">{uploading ? 'Envoi...' : 'Ajouter'}</span>
                  </button>
                </div>

                <p className={hint}>
                  Les captures sont envoyées immédiatement. Si l&apos;enregistrement échoue
                  ensuite, elles restent en place et il n&apos;y a rien à recommencer.
                </p>
              </div>

              <div>
                <label htmlFor="videoUrl" className={label}>
                  Vidéo de démonstration
                </label>
                <input
                  id="videoUrl"
                  className={input}
                  placeholder="https://youtube.com/..."
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ---------------- Technique ---------------- */}
          {tab === 'technique' && (
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className={label}>Architecture</p>
                  <button
                    type="button"
                    onClick={addArchitectureRow}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une ligne
                  </button>
                </div>

                {architecture.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-400 dark:border-slate-700">
                    Rien pour l&apos;instant. Exemples utiles : Frontend, Backend, Base de
                    données, Authentification, Hébergement, Temps de réponse.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {architecture.map((row, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          className={`${input} w-1/3`}
                          placeholder="Frontend"
                          value={row.key}
                          onChange={(e) => patchArchitectureRow(index, { key: e.target.value })}
                        />
                        <input
                          className={input}
                          placeholder="Next.js 16, rendu serveur"
                          value={row.value}
                          onChange={(e) => patchArchitectureRow(index, { value: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => removeArchitectureRow(index)}
                          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className={label}>Technologies utilisées</p>
                  <span className="text-xs text-slate-400">{skillIds.length} sélectionnée(s)</span>
                </div>

                {skills.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-400 dark:border-slate-700">
                    Aucune compétence enregistrée. Crée-les dans l&apos;écran Compétences :
                    seules des compétences existantes peuvent être rattachées à un projet.
                  </p>
                ) : (
                  <div className="max-h-56 space-y-4 overflow-y-auto rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    {skillsByCategory.map(([category, items]) => (
                      <div key={category}>
                        <p className="mb-1.5 text-xs font-semibold text-slate-400">{category}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((skill) => (
                            <button
                              key={skill.id}
                              type="button"
                              onClick={() => toggleSkill(skill.id)}
                              className={[
                                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                                skillIds.includes(skill.id)
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-slate-300 text-slate-600 hover:border-indigo-400 dark:border-slate-700 dark:text-slate-300',
                              ].join(' ')}
                            >
                              {skill.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="documentation" className={label}>
                  Notes de documentation
                </label>
                <textarea
                  id="documentation"
                  rows={5}
                  className={area}
                  placeholder="Décisions techniques, dépendances notables, ce qu'il faut savoir pour reprendre le code."
                  value={form.documentation}
                  onChange={(e) => setForm({ ...form, documentation: e.target.value })}
                />
                <p className={hint}>{form.documentation.length} / 50 000 caractères</p>
              </div>
            </div>
          )}

          <footer className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? 'Enregistrer les modifications' : 'Créer le projet'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
