"use client";

import { useSyncExternalStore } from 'react';
import SceneCanvas from '../fx/scene-canvas';
import HeroScene from './hero-scene';
import OrbitScene, { type OrbitItem } from './orbit-scene';
import ShieldScene from './shield-scene';

/**
 * Les trois toiles 3D du site, chacune avec sa caméra et son visuel de
 * repli. Ce module importe three.js : il n'est chargé que via
 * `./lazy.tsx`, après l'affichage de la page.
 */

const coarsePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

const useCoarsePointer = () =>
  useSyncExternalStore(
    () => () => {},
    coarsePointer,
    () => false
  );

export function HeroCanvas({ fallback }: { fallback: React.ReactNode }) {
  return (
    <SceneCanvas className="h-full w-full" fallback={fallback} camera={{ position: [0, 0.6, 7.2], fov: 42 }}>
      <HeroScene />
    </SceneCanvas>
  );
}

export function OrbitCanvas({ items, fallback }: { items: OrbitItem[]; fallback: React.ReactNode }) {
  const coarse = useCoarsePointer();
  return (
    <SceneCanvas className="h-full w-full" fallback={fallback} camera={{ position: [0, 1.2, 9.5], fov: 45 }}>
      <OrbitScene items={items} interactive={!coarse} />
    </SceneCanvas>
  );
}

export function ShieldCanvas({ fallback }: { fallback: React.ReactNode }) {
  return (
    <SceneCanvas className="h-full w-full" fallback={fallback} camera={{ position: [0, 0, 7.5], fov: 45 }}>
      <ShieldScene />
    </SceneCanvas>
  );
}
