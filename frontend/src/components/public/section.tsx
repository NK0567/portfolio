import React from 'react';
import Reveal from './fx/reveal';

interface Props {
  id: string;
  /** Petit libellé au-dessus du titre, en capitales mono. */
  eyebrow?: string;
  title: string;
  /** Une phrase qui dit ce que la section contient, pas un slogan. */
  intro?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Enveloppe commune des sections publiques : même largeur, même rythme
 * vertical, même apparition du titre. Les sections ne diffèrent que par
 * leur contenu, ce qui donne à la page sa cohérence.
 */
export default function Section({ id, eyebrow, title, intro, action, children, className }: Props) {
  return (
    <section id={id} className={`relative ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Reveal className="min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl">
              {title}
            </h2>
            {intro && (
              <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-haze sm:text-lg">{intro}</p>
            )}
          </Reveal>
          {action && (
            <Reveal delay={0.15} className="shrink-0">
              {action}
            </Reveal>
          )}
        </div>

        {children}
      </div>
    </section>
  );
}
