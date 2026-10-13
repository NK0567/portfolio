"use client";

import { useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * Effets d'ambiance communes à toutes les pages publiques :
 * la lueur du fond qui suit la souris et la barre de lecture en haut.
 *
 * La lueur ne modifie que deux variables CSS, regroupées dans une image
 * d'animation : le navigateur repeint un dégradé, sans recalcul de mise en
 * page. Désactivée sur écran tactile, où il n'y a pas de pointeur à suivre.
 */
export default function Ambient() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const root = document.documentElement;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--mx', `${event.clientX}px`);
        root.style.setProperty('--my', `${event.clientY}px`);
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <>
      <div aria-hidden className="site-backdrop" />
      <motion.div
        aria-hidden
        style={{ scaleX }}
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-cyan via-signal to-violet"
      />
    </>
  );
}
