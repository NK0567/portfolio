"use client";

import React, { Component, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';

interface Props extends Omit<CanvasProps, 'children'> {
  children: React.ReactNode;
  /** Affiché tant que la scène n'est pas montée, et si WebGL est absent. */
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Toile 3D économe.
 *
 * Trois scènes 3D sur une même page, c'est trois contextes WebGL et trois
 * boucles de rendu à 60 images par seconde. Pour que le site reste fluide
 * sur un portable moyen ou un téléphone :
 *
 *  - la scène n'est montée qu'à l'approche de l'écran (marge de 300 px) ;
 *  - une fois sortie de l'écran, elle cesse de calculer des images
 *    (frameloop « never ») au lieu d'être détruite puis recréée ;
 *  - la densité de pixels est plafonnée à 1,75 ;
 *  - avec « réduire les animations » activé, une seule image est rendue ;
 *  - sans WebGL (navigateur ancien, pilote bloqué), le visuel de repli
 *    s'affiche au lieu d'une erreur.
 */
export default function SceneCanvas({ children, fallback = null, className, ...canvasProps }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setMounted(true);
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const frameloop = reduce ? 'demand' : visible ? 'always' : 'never';

  return (
    <div ref={ref} className={className}>
      {mounted ? (
        <WebGLBoundary fallback={fallback}>
          <Canvas
            dpr={[1, 1.75]}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            frameloop={frameloop}
            {...canvasProps}
          >
            <Suspense fallback={null}>{children}</Suspense>
          </Canvas>
        </WebGLBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}

class WebGLBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
