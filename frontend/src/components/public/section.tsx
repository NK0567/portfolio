import React from 'react';

interface Props {
  id: string;
  title: string;
  /** Une phrase qui dit ce que la section contient, pas un slogan. */
  intro?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Enveloppe commune des sections publiques.
 *
 * Volontairement sans surtitre en capitales espacées au-dessus du titre :
 * c'est un ornement qui n'ajoute aucune information, et il trahit le gabarit
 * réutilisé d'une section à l'autre. Le titre et la phrase d'intro suffisent.
 */
export default function Section({ id, title, intro, action, children }: Props) {
  return (
    <section id={id} className="border-b border-rule">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
            {intro && <p className="mt-2 max-w-[62ch] text-haze">{intro}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {children}
      </div>
    </section>
  );
}
