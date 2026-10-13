"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import { GithubIcon } from '@/components/icons/brand-icons';
import Section from '../section';
import Reveal from '../fx/reveal';
import { text } from '@/lib/content';
import { PROJECT_STATUS_LABELS, type Project } from '@/types/api';

interface Props {
  projects: Project[];
  assetBase: string;
}

const STATUS_DOT: Record<string, string> = {
  COMPLETED: 'bg-success',
  DEVELOPMENT: 'bg-cyan',
  MAINTENANCE: 'bg-violet',
  ARCHIVED: 'bg-haze',
};

/**
 * Vitrine des projets.
 *
 * Un projet à la fois, mis en scène dans un portable et un téléphone qui
 * s'inclinent vers la souris. La liste à droite permet de sauter
 * directement à celui qui intéresse : un recruteur pressé ne fera pas
 * défiler un carrousel jusqu'au bout. Le défilement automatique s'arrête
 * dès que la souris est sur la vitrine.
 */
export default function ProjectsShowcase({ projects, assetBase }: Props) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  const asset = useCallback(
    (path: string | null | undefined) =>
      !path ? null : /^https?:\/\//.test(path) ? path : `${assetBase}${path.startsWith('/') ? '' : '/'}${path}`,
    [assetBase]
  );

  const count = projects.length;
  const go = useCallback((delta: number) => setActive((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    if (paused || reduce || count < 2) return;
    const timer = setInterval(() => go(1), 7000);
    return () => clearInterval(timer);
  }, [paused, reduce, count, go]);

  // Inclinaison 3D qui suit la souris, amortie par un ressort.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 18 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });

  if (count === 0) {
    return (
      <Section id="projets" eyebrow="Réalisations" title="Projets">
        <p className="text-haze">Aucun projet publié pour le moment.</p>
      </Section>
    );
  }

  const project = projects[active]!;
  const cover = asset(project.mainImage);
  const mobileShot = asset(project.images?.[1] ?? project.images?.[0] ?? project.mainImage);

  return (
    <Section
      id="projets"
      eyebrow="Réalisations"
      title="Des projets concrets, en production"
      intro="Chaque fiche détaille l'architecture retenue, les difficultés rencontrées et ce qui en est sorti."
      action={
        count > 1 && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => go(-1)} aria-label="Projet précédent" className="neon-ring flex h-10 w-10 items-center justify-center rounded-full text-ink transition-transform hover:-translate-x-0.5">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-sm text-graphite">
              {String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
            <button type="button" onClick={() => go(1)} aria-label="Projet suivant" className="neon-ring flex h-10 w-10 items-center justify-center rounded-full text-ink transition-transform hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )
      }
    >
      <div
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <Reveal className="min-w-0">
          {/* Scène : portable + téléphone */}
          <div
            className="relative flex aspect-[16/11] items-center justify-center [perspective:1400px] sm:aspect-[16/10]"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              mx.set((e.clientX - rect.left) / rect.width - 0.5);
              my.set((e.clientY - rect.top) / rect.height - 0.5);
            }}
            onMouseLeave={() => {
              mx.set(0);
              my.set(0);
            }}
          >
            <div aria-hidden className="absolute inset-x-10 bottom-4 h-24 rounded-full bg-signal/30 blur-3xl" />

            <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="relative w-[88%]">
              {/* Écran */}
              <div className="rounded-t-2xl border border-signal/30 bg-[#0b1226] p-2 shadow-[0_30px_80px_-20px_rgba(59,130,246,0.55)] sm:p-3">
                <div className="mb-2 flex gap-1.5 px-1">
                  <span className="h-2 w-2 rounded-full bg-red-400/80" />
                  <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                </div>
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-surface">
                  <AnimatePresence mode="popLayout">
                    {cover && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <motion.img
                        key={project.id}
                        src={cover}
                        alt={`Capture du projet ${project.title}`}
                        initial={{ opacity: 0, scale: 1.06 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7 }}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                  </AnimatePresence>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-paper/40 via-transparent to-cyan/10" />
                </div>
              </div>
              {/* Socle */}
              <div className="mx-auto h-3 w-[104%] -translate-x-[2%] rounded-b-xl bg-gradient-to-b from-[#1b2645] to-[#0d1530]" />
              <div className="mx-auto h-1 w-1/4 rounded-b-md bg-[#0d1530]" />

              {/* Téléphone, au premier plan */}
              {mobileShot && (
                <motion.div
                  style={{ translateZ: 60 }}
                  animate={reduce ? undefined : { y: [0, -8, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-6 -right-4 w-[24%] rounded-[1.4rem] border border-cyan/40 bg-[#0b1226] p-1.5 shadow-[0_20px_50px_-10px_rgba(34,211,238,0.5)] sm:-right-8"
                >
                  <div className="relative aspect-[9/19] overflow-hidden rounded-[1.1rem] bg-surface">
                    <AnimatePresence mode="popLayout">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <motion.img
                        key={`${project.id}-m`}
                        src={mobileShot}
                        alt=""
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Fiche du projet actif */}
          <AnimatePresence mode="wait">
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45 }}
              className="mt-10"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-2xl font-bold text-ink sm:text-3xl">{project.title}</h3>
                <span className="chip">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[project.status] ?? 'bg-haze'}`} />
                  {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(project.skills ?? []).slice(0, 8).map((skill) => (
                  <span key={skill.id} className="chip">{skill.name}</span>
                ))}
              </div>
              <p className="mt-4 max-w-[68ch] leading-relaxed text-haze">{text(project.description)}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/projects/${project.slug}`} className="btn-primary">
                  Voir l&apos;étude de cas
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                {project.demoUrl && (
                  <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    <ExternalLink className="h-4 w-4" />
                    Démo
                  </a>
                )}
                {project.githubUrl && (
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    <GithubIcon className="h-4 w-4" />
                    Code
                  </a>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </Reveal>

        {/* Liste des projets */}
        <ul className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {projects.map((p, index) => {
            const selected = index === active;
            return (
              <Reveal as="li" key={p.id} delay={index * 0.07} direction="left" className="min-w-[240px] lg:min-w-0">
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-current={selected}
                  className={[
                    'glass relative w-full overflow-hidden p-4 text-left transition-all duration-300',
                    selected ? '!border-cyan/60 shadow-[0_0_30px_-8px_rgba(34,211,238,0.6)]' : 'opacity-70 hover:opacity-100',
                  ].join(' ')}
                >
                  {selected && !reduce && count > 1 && !paused && (
                    <motion.span
                      key={`bar-${active}`}
                      className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-cyan to-violet"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 7, ease: 'linear' }}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[p.status] ?? 'bg-haze'}`} />
                    <p className="truncate font-display font-semibold text-ink">{p.title}</p>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-haze">{text(p.description)}</p>
                </button>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
