"use client";

import dynamic from 'next/dynamic';
import type { OrbitItem } from './orbit-scene';

/**
 * Points d'entrée des scènes 3D.
 *
 * three.js pèse plusieurs centaines de Ko : chargé normalement, il
 * retarderait l'affichage du texte de toute la page. Ici il arrive dans un
 * morceau séparé, après le premier rendu, et jamais côté serveur (WebGL
 * n'y existe pas). Pendant le chargement, le visuel de repli occupe la
 * place pour que rien ne saute à l'arrivée de la scène.
 */

const load = () => import('./canvases');

const HeroCanvas = dynamic(() => load().then((m) => m.HeroCanvas), {
  ssr: false,
  loading: () => <GlowFallback />,
});
const OrbitCanvas = dynamic(() => load().then((m) => m.OrbitCanvas), {
  ssr: false,
  loading: () => <GlowFallback />,
});
const ShieldCanvas = dynamic(() => load().then((m) => m.ShieldCanvas), {
  ssr: false,
  loading: () => <GlowFallback />,
});

/** Halo de repli : ce qu'on voit avant la 3D, ou à sa place sans WebGL. */
export function GlowFallback({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-full w-full ${className}`} aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal/30 blur-3xl animate-pulse-glow" />
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/40 animate-spin-slow" />
    </div>
  );
}

export const HeroVisual = () => <HeroCanvas fallback={<GlowFallback />} />;

export const OrbitVisual = ({ items }: { items: OrbitItem[] }) => (
  <OrbitCanvas items={items} fallback={<GlowFallback />} />
);

export const ShieldVisual = () => <ShieldCanvas fallback={<GlowFallback />} />;
