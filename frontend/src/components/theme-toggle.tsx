"use client";

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  /*
   * Le thème réel n'est connu qu'après l'hydratation : le serveur ne sait pas
   * ce que contient le localStorage du visiteur. Rendre l'icône avant ce
   * moment provoque une erreur d'hydratation React. On affiche donc un
   * emplacement vide de même taille jusqu'au montage, ce qui évite aussi que
   * la mise en page saute.
   */
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">Changer le thème</span>
    </button>
  );
}
