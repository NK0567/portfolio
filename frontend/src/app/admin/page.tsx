"use client";

import Link from 'next/link';
import { FolderKanban, Star, Briefcase, GraduationCap, FileDown, ArrowRight } from 'lucide-react';

import AdminShell from '@/components/admin/admin-shell';
import DashboardCharts from '@/components/admin/dashboard-charts';
import { cvService } from '@/services/cv.service';

const shortcuts = [
  { name: 'Projets', href: '/admin/projects', icon: FolderKanban, desc: 'Ajouter ou modifier un projet' },
  { name: 'Compétences', href: '/admin/skills', icon: Star, desc: 'Technologies et niveaux' },
  { name: 'Expériences', href: '/admin/experiences', icon: Briefcase, desc: 'Parcours professionnel' },
  { name: 'Formation', href: '/admin/education', icon: GraduationCap, desc: 'Diplômes et écoles' },
];

export default function DashboardPage() {
  return (
    <AdminShell title="Vue d'ensemble">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
          >
            <item.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="mt-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
              {item.name}
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
          </Link>
        ))}
      </section>

      {/*
        Le CV n'est pas un fichier stocké : il est régénéré à chaque
        téléchargement depuis les projets, compétences, expériences et
        formations ci-dessus. Rien à re-téléverser après une modification.
      */}
      <section className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">CV dynamique</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Régénéré à chaque téléchargement à partir de tes données. Toujours à jour.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings"
            className="px-3 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Aperçu
          </Link>
          <a
            href={cvService.downloadUrl('fr')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
          >
            <FileDown className="h-4 w-4" /> Télécharger
          </a>
        </div>
      </section>

      <DashboardCharts />
    </AdminShell>
  );
}
