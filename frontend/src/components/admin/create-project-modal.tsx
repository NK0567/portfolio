'use client';

import React, { useEffect, useState } from 'react';
import {
  Loader2,
  Plus,
  X,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';

import { projectService } from '@/services/project.service';
import { skillService } from '@/services/skill.service';
import { getErrorMessage } from '@/lib/api';
import { PROJECT_STATUS_LABELS, type ProjectStatus, type Skill } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

const inputClass =
  'mt-1 bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-600';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function CreateProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: CreateProjectModalProps) {
  const [title, setTitle] = useState('');
  const [descriptionFr, setDescriptionFr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('DEVELOPMENT');
  const [date, setDate] = useState(todayISO());
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');

  const [imageMode, setImageMode] = useState<'url' | 'file'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  /*
   * Les compétences ne sont plus saisies en texte libre.
   * Le backend attend des identifiants UUID de compétences EXISTANTES
   * (champ `skillIds`), pas une liste de noms : c'est ce qui produisait
   * l'erreur 400 avec l'ancien champ `technologies`.
   */
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setSkillsLoading(true);

    skillService
      .getAll()
      .then((skills) => {
        if (!cancelled) setAvailableSkills(skills);
      })
      .catch(() => {
        if (!cancelled) setAvailableSkills([]);
      })
      .finally(() => {
        if (!cancelled) setSkillsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // L'URL d'objet créée pour l'aperçu doit être libérée, sinon le fichier
  // reste en mémoire tant que l'onglet est ouvert.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleResetImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setImageUrl('');
  };

  const toggleSkill = (id: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescriptionFr('');
    setDescriptionEn('');
    setStatus('DEVELOPMENT');
    setDate(todayISO());
    setGithubUrl('');
    setDemoUrl('');
    setSelectedSkillIds([]);
    handleResetImage();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // L'image de couverture est obligatoire côté backend : on le signale ici
    // plutôt que de laisser partir une requête vouée au 422.
    if (imageMode === 'url' && !imageUrl.trim()) {
      setError("Une image de couverture est obligatoire (URL ou fichier).");
      return;
    }
    if (imageMode === 'file' && !imageFile) {
      setError('Sélectionne un fichier image, ou bascule en mode URL.');
      return;
    }

    setLoading(true);

    try {
      await projectService.create({
        title: title.trim(),
        description: {
          fr: descriptionFr.trim(),
          // Le backend exige les deux langues. Tant que le site public est en
          // français, on recopie le français si l'anglais n'est pas renseigné.
          en: descriptionEn.trim() || descriptionFr.trim(),
        },
        status,
        // Le backend attend une date : on l'envoie au format ISO.
        date: new Date(date).toISOString(),
        skillIds: selectedSkillIds,
        githubUrl: githubUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        ...(imageMode === 'file'
          ? { coverImage: imageFile }
          : { mainImage: imageUrl.trim() }),
      });

      resetForm();
      onProjectCreated();
      onClose();
    } catch (err) {
      // getErrorMessage déplie le format 422 du backend et affiche
      // précisément quel champ pose problème.
      setError(getErrorMessage(err, 'Impossible de créer le projet.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Ajouter un nouveau projet
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="whitespace-pre-line">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Titre du projet * <span className="font-normal text-slate-400">(3 caractères min.)</span>
            </Label>
            <Input
              id="title"
              required
              minLength={3}
              placeholder="ex: UniPay Mobile App"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <Label htmlFor="descFr" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Description (français) *
            </Label>
            <textarea
              id="descFr"
              required
              rows={3}
              placeholder="Courte description de ce que fait l'application..."
              value={descriptionFr}
              onChange={(e) => setDescriptionFr(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div>
            <Label htmlFor="descEn" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Description (anglais){' '}
              <span className="font-normal text-slate-400">— laissé vide, le français est recopié</span>
            </Label>
            <textarea
              id="descEn"
              rows={2}
              placeholder="Short description of what the app does..."
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="status" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Statut *
              </Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {PROJECT_STATUS_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="date" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Date du projet *
              </Label>
              <Input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Image de couverture */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-indigo-500" /> Image de couverture *
              </Label>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setImageMode('url');
                    handleResetImage();
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                    imageMode === 'url'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="h-3 w-3 inline mr-1" /> URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageMode('file');
                    handleResetImage();
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                    imageMode === 'file'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="h-3 w-3 inline mr-1" /> Fichier
                </button>
              </div>
            </div>

            {imageMode === 'url' ? (
              <Input
                type="url"
                placeholder="https://domaine.com/image.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={inputClass}
              />
            ) : (
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                onChange={handleFileChange}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-600 dark:file:text-indigo-400 file:border-0 file:rounded-md file:px-2.5 file:py-1 file:text-xs file:font-semibold file:mr-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            )}

            {(imagePreview || imageUrl) && (
              <div className="relative h-32 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview ?? imageUrl}
                  alt="Aperçu du projet"
                  className="h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <button
                  type="button"
                  onClick={handleResetImage}
                  className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Compétences */}
          <div>
            <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Technologies utilisées
            </Label>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sélectionne parmi tes compétences existantes. Pour en ajouter une nouvelle, passe
              par la page Compétences.
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {skillsLoading ? (
                <span className="text-xs text-slate-400 inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Chargement des compétences...
                </span>
              ) : availableSkills.length === 0 ? (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Aucune compétence enregistrée pour l'instant.
                </span>
              ) : (
                availableSkills.map((skill) => {
                  const selected = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors ${
                        selected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      {skill.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="githubUrl" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Lien GitHub
              </Label>
              <Input
                id="githubUrl"
                type="url"
                placeholder="https://github.com/..."
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <Label htmlFor="demoUrl" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Lien Démo (Live)
              </Label>
              <Input
                id="demoUrl"
                type="url"
                placeholder="https://mon-projet.com"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="mr-1 h-4 w-4" /> Enregistrer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
