"use client";

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, FileDown, MapPin, Mouse } from 'lucide-react';
import { HeroVisual } from './three/lazy';
import CountUp from './fx/count-up';
import { cvService } from '@/services/cv.service';

interface Props {
  fullName: string;
  headline: string;
  titles: string[];
  bio: string;
  location: string | null;
  available: boolean;
  availability: string | null;
  counts: { projects: number; skills: number; years: number; labs: number };
}

/**
 * Ouverture de la page.
 *
 * Le recruteur doit savoir en trois secondes qui il a devant lui, ce que
 * cette personne fait, et si elle est disponible. Tout le reste de la page
 * en est la démonstration : le nom en grand, le métier qui se tape au
 * clavier, quatre chiffres tirés de la base, deux boutons.
 */
export default function Hero({ fullName, headline, titles, bio, location, available, availability, counts }: Props) {
  const reduce = useReducedMotion();
  const [first, ...rest] = fullName.split(' ');

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
  };
  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 24, filter: 'blur(8px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
  };

  const stats = [
    { value: counts.years, suffix: '+', label: "ans d'expérience" },
    { value: counts.projects, suffix: '', label: 'projets livrés' },
    { value: counts.skills, suffix: '', label: 'technologies' },
    ...(counts.labs > 0 ? [{ value: counts.labs, suffix: '', label: 'labs sécurité' }] : []),
  ];

  return (
    <section id="top" className="relative flex min-h-[100svh] items-center overflow-hidden pt-24">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-[1.05fr_1fr]">
        <motion.div variants={container} initial="hidden" animate="visible" className="relative z-10 min-w-0">
          {available && (
            <motion.p
              variants={item}
              className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-success/30 bg-success/10 px-3.5 py-1.5 text-xs font-medium text-success"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              {availability || 'Disponible pour un poste ou une mission'}
            </motion.p>
          )}

          <motion.p variants={item} className="eyebrow">
            {headline}
          </motion.p>

          <motion.h1
            variants={item}
            className="mt-4 font-display text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-7xl"
          >
            {first} <span className="text-gradient">{rest.join(' ')}</span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 h-8 font-mono text-lg text-graphite sm:text-xl">
            <span className="text-cyan">&gt;</span> <Typewriter words={titles.length > 0 ? titles : [headline]} />
          </motion.p>

          {bio && (
            <motion.p variants={item} className="mt-5 max-w-[56ch] leading-relaxed text-haze">
              {bio}
            </motion.p>
          )}

          <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#projets" className="btn-primary">
              Voir mes réalisations
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href={cvService.downloadUrl('fr')} className="btn-ghost">
              <FileDown className="h-4 w-4" />
              Télécharger le CV
            </a>
          </motion.div>

          {location && (
            <motion.p variants={item} className="mt-6 inline-flex items-center gap-1.5 text-sm text-haze">
              <MapPin className="h-4 w-4 text-cyan" />
              {location} · ouvert au télétravail
            </motion.p>
          )}

          <motion.dl
            variants={item}
            className="mt-12 grid max-w-xl grid-cols-2 gap-6 border-t border-signal/15 pt-8 sm:grid-cols-4"
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-3xl font-bold text-ink">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </dd>
                <dd className="mt-1 text-xs text-haze">{stat.label}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative -mx-5 h-[380px] sm:mx-0 sm:h-[520px] lg:h-[600px]"
        >
          <div aria-hidden className="absolute inset-10 rounded-full bg-signal/20 blur-[90px]" />
          <HeroVisual />
        </motion.div>
      </div>

      <a
        href="#stack"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-haze transition-colors hover:text-ink sm:flex"
      >
        <span className="relative flex h-9 w-6 justify-center rounded-full border border-haze/50 pt-2">
          <span className="h-1.5 w-1 rounded-full bg-cyan" style={{ animation: 'scroll-dot 1.8s infinite' }} />
        </span>
        <Mouse className="sr-only" />
        Défiler pour explorer
      </a>
    </section>
  );
}

/** Tape puis efface chaque intitulé, en boucle. */
function Typewriter({ words }: { words: string[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const word = words[index % words.length] ?? '';

  useEffect(() => {
    if (reduce) return;

    const done = !deleting && length === word.length;
    const empty = deleting && length === 0;
    const delay = done ? 1800 : empty ? 350 : deleting ? 35 : 70;

    const timer = setTimeout(() => {
      if (done) setDeleting(true);
      else if (empty) {
        setDeleting(false);
        setIndex((i) => (i + 1) % words.length);
      } else setLength((l) => l + (deleting ? -1 : 1));
    }, delay);

    return () => clearTimeout(timer);
  }, [length, deleting, word, words.length, reduce]);

  return (
    <span className="text-ink">
      {reduce ? word : word.slice(0, length)}
      <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-cyan animate-blink" />
    </span>
  );
}
