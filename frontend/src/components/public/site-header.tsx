"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FileDown, Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cvService } from '@/services/cv.service';

/**
 * En-tête du site public.
 *
 * Aucun lien vers l'administration : on y accède en tapant /admin dans la
 * barre d'adresse. Un bouton visible ne protège rien et indique à tous les
 * robots où se trouve la porte.
 */

const SECTIONS = [
  { id: 'projets', label: 'Projets' },
  { id: 'labs', label: 'Labs' },
  { id: 'competences', label: 'Compétences' },
  { id: 'parcours', label: 'Parcours' },
  { id: 'contact', label: 'Contact' },
];

interface Props {
  name: string;
  /** La section Labs n'existe que si un lab est publié : pas de lien mort. */
  showLabs?: boolean;
}

export default function SiteHeader({ name, showLabs = false }: Props) {
  const sections = useMemo(
    () => SECTIONS.filter((s) => s.id !== 'labs' || showLabs),
    [showLabs]
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>('');

  /*
   * Surlignage de la section en cours de lecture.
   *
   * IntersectionObserver plutôt qu'un écouteur de défilement : le navigateur
   * fait le calcul lui-même, hors du fil principal, au lieu de déclencher une
   * fonction à chaque pixel parcouru.
   */
  useEffect(() => {
    const targets = sections.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null
    );

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="font-semibold tracking-tight text-ink">
          {name}
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`/#${section.id}`}
              className={[
                'text-sm transition-colors',
                active === section.id ? 'text-signal' : 'text-haze hover:text-ink',
              ].join(' ')}
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={cvService.downloadUrl('fr')}
            className="hidden items-center gap-2 rounded-sm border border-ink px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper sm:inline-flex"
          >
            <FileDown className="h-4 w-4" />
            Télécharger le CV
          </a>

          <ThemeToggle />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-rule text-ink md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="menu-mobile" className="border-t border-rule px-5 py-3 md:hidden">
          <ul className="space-y-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`/#${section.id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-sm px-2 py-2 text-sm text-graphite hover:bg-rule/40"
                >
                  {section.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={cvService.downloadUrl('fr')}
                className="block rounded-sm px-2 py-2 text-sm font-medium text-signal"
              >
                Télécharger le CV
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
