"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, FileDown, Menu, X } from 'lucide-react';
import { cvService } from '@/services/cv.service';

/**
 * En-tête du site public.
 *
 * Transparent en haut de page, il devient une barre de verre dépoli dès
 * qu'on défile. Aucun lien vers l'administration : on y accède en tapant
 * /admin. Un bouton visible ne protège rien et indique à tous les robots
 * où se trouve la porte.
 */

export const NAV_SECTIONS = [
  { id: 'stack', label: 'Stack' },
  { id: 'projets', label: 'Projets' },
  { id: 'competences', label: 'Compétences' },
  { id: 'securite', label: 'Sécurité' },
  { id: 'parcours', label: 'Parcours' },
  { id: 'contact', label: 'Contact' },
];

interface Props {
  name: string;
}

const monogram = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');

export default function SiteHeader({ name }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /*
   * Surlignage de la section en cours de lecture. IntersectionObserver
   * plutôt qu'un écouteur de défilement : le navigateur fait le calcul
   * lui-même, hors du fil principal.
   */
  useEffect(() => {
    const targets = NAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(
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
      { rootMargin: '-35% 0px -60% 0px' }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled || open
          ? 'border-b border-signal/15 bg-paper/70 backdrop-blur-xl'
          : 'border-b border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="Accueil">
          <span className="neon-ring flex h-9 w-9 items-center justify-center rounded-xl font-display text-sm font-bold text-ink transition-transform duration-300 group-hover:rotate-6">
            {monogram(name)}
          </span>
          <span className="hidden font-display text-sm font-semibold tracking-tight text-ink sm:block">
            {name}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections">
          {NAV_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`/#${section.id}`}
              className={[
                'relative rounded-full px-3.5 py-1.5 text-sm transition-colors',
                active === section.id ? 'text-ink' : 'text-haze hover:text-ink',
              ].join(' ')}
            >
              {active === section.id && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 -z-10 rounded-full border border-signal/30 bg-signal/15"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {section.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={cvService.downloadUrl('fr')}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm text-graphite transition-colors hover:text-ink md:inline-flex"
          >
            <FileDown className="h-4 w-4" />
            CV
          </a>
          <a href="/#contact" className="btn-primary hidden !px-4 !py-2 sm:inline-flex">
            Parlons-en
            <ArrowUpRight className="h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rule text-ink lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="menu-mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-signal/15 lg:hidden"
          >
            <ul className="space-y-1 px-5 py-4">
              {NAV_SECTIONS.map((section, index) => (
                <motion.li
                  key={section.id}
                  initial={{ x: -12, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <a
                    href={`/#${section.id}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-base text-graphite hover:bg-signal/10 hover:text-ink"
                  >
                    {section.label}
                  </a>
                </motion.li>
              ))}
              <li className="pt-2">
                <a href={cvService.downloadUrl('fr')} className="btn-ghost w-full">
                  <FileDown className="h-4 w-4" />
                  Télécharger le CV
                </a>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
