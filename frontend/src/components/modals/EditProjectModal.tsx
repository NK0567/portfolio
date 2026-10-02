'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Save, X, Upload, Link as LinkIcon, Image as ImageIcon, AlertCircle } from 'lucide-react';

import { projectService } from '@/services/project.service';
import { skillService } from '@/services/skill.service';
import { getErrorMessage } from '@/lib/api';
import { PROJECT_STATUS_LABELS, type Project, type ProjectStatus, type Skill } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated: () => void;
  project: Project | null;
}

const inputClass =
  'mt-1 bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-600';
const areaClass =
  'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600';

/**
 * Modification d'un projet.
 *
 * Comme le formulaire de création, il envoie exactement les champs du schéma
 * Prisma (`description` bilingue, `mainImage`, `demoUrl`, `skillIds`) et non
 * l'ancienne forme MongoDB (`imageUrl`, `liveUrl`, `technologies`) qui
 * déclenchait les erreurs 400 puis 422.
 */
export default function EditProjectModal({
  isOpen,
  onClose,
  onProjectUpdated,
  project,
}: EditProjectModalProps) {
  const [title, setTitle] = useState('');
  const [descriptionFr, setDescriptionFr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('DEVELOPMENT');
  const [date, setDate] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');

  const [imageMode, setImageMode] = useState<'url' | 'file'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recharge le formulaire dès qu'un autre projet est sélectionné.
  useEffect(() => {
    if (!project) return;
    setTitle(project.title);
    setDescriptionFr(project.description?.fr ?? '');
    setDescriptionEn(project.description?.en ?? '');
    setStatus(project.status);
    setDate(project.date ? project.date.slice(0, 10) : '');
    setGithubUrl(project.githubUrl ?? '');
    setDemoUrl(project.demoUrl ?? '');
    setImageUrl(project.mainImage ?? '');
    setSelectedSkillIds((project.skills ?? []).map((s) => s.id));
    setImageMode('url');
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  }, [project]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    skillService
      .getAll()
      .then((skills) => {
        if (!cancelled) setAvailableSkills(skills);
      })
      .catch(() => {
        if (!cancelled) setAvailableSkills([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  if (!isOpen || !project) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleSkill = (id: string) =>
    setSelectedSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await projectService.update(project.id, {
        title: title.trim(),
        description: {
          fr: descriptionFr.trim(),
          en: descriptionEn.trim() || descriptionFr.trim(),
        },
        status,
        date: date ? new Date(date).toISOString() : undefined,
        skillIds: selectedSkillIds,
        githubUrl: githubUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        ...(imageMode === 'file' && imageFile
          ? { coverImage: imageFile }
          : imageUrl.trim()
            ? { mainImage: imageUrl.trim() }
            : {}),
      });

      onProjectUpdated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de modifier le projet.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Modifier le projet</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
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

        {/*
          Le slug n'est pas modifiable : il est fixé à la création pour que
          l'URL publique du projet reste stable (liens partagés, indexation).
        */}
        <p className="text-[11px] text-slate-400">
          URL publique : <code className="text-slate-500">/projets/{project.slug}</code> (non modifiable)
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Titre *</Label>
            <Input
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Description (français) *
            </Label>
            <textarea
              required
              rows={3}
              value={descriptionFr}
              onChange={(e) => setDescriptionFr(e.target.value)}
              className={areaClass}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Description (anglais) <span className="font-normal text-slate-400">— facultatif</span>
            </Label>
            <textarea
              rows={2}
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              className={areaClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Statut</Label>
              <select
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
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-indigo-500" /> Image de couverture
              </Label>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                    imageMode === 'url'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  <LinkIcon className="h-3 w-3 inline mr-1" /> URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('file')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                    imageMode === 'file'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  <Upload className="h-3 w-3 inline mr-1" /> Fichier
                </button>
              </div>
            </div>

            {imageMode === 'url' ? (
              <Input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputClass} />
            ) : (
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                onChange={handleFileChange}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-2 text-sm file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-600 dark:file:text-indigo-400 file:border-0 file:rounded-md file:px-2.5 file:py-1 file:text-xs file:font-semibold file:mr-3 cursor-pointer"
              />
            )}

            {(imagePreview || imageUrl) && (
              <div className="relative h-28 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview ?? imageUrl}
                  alt="Aperçu"
                  className="h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Technologies</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {availableSkills.length === 0 ? (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Aucune compétence enregistrée.
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
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Lien GitHub</Label>
              <Input type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Lien Démo</Label>
              <Input type="url" value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
