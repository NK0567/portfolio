"use client";

import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: Direction;
  /** Distance du glissement, en pixels. */
  distance?: number;
  as?: 'div' | 'li' | 'section' | 'article' | 'span';
}

const offset = (direction: Direction, distance: number) => {
  switch (direction) {
    case 'up': return { y: distance };
    case 'down': return { y: -distance };
    case 'left': return { x: distance };
    case 'right': return { x: -distance };
    default: return {};
  }
};

/**
 * Apparition au défilement : fondu, glissement et léger flou qui se dissipe.
 *
 * Jouée une seule fois par élément : rejouer l'animation à chaque passage
 * fatigue dès la deuxième lecture de la page.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 28,
  as = 'div',
}: Props) {
  const reduce = useReducedMotion();
  const Component = motion[as];

  const variants: Variants = {
    hidden: reduce
      ? { opacity: 0 }
      : { opacity: 0, filter: 'blur(6px)', ...offset(direction, distance) },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      variants={variants}
    >
      {children}
    </Component>
  );
}
