"use client";

import Link from 'next/link';
import { FileDown } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cvService } from '@/services/cv.service';

/**
 * En-tête du site public.
 *
 * Aucun lien vers l'administration : l'accès se fait en tapant /admin
 * directement dans la barre d'adresse. Un bouton visible sur la page
 * d'accueil ne protège rien, mais il indique à tous les visiteurs — et à
 * tous les robots — où se trouve la porte d'entrée.
 */
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
        <Link href="/" className="font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Boris Ngouadjeu
        </Link>

        <div className="flex items-center gap-2">
          <a
            href={cvService.downloadUrl('fr')}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Télécharger mon CV</span>
            <span className="sm:hidden">CV</span>
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
