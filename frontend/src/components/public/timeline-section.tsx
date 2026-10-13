"use client";

import { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Briefcase, GraduationCap } from 'lucide-react';
import Reveal from './fx/reveal';
import { text, list, period } from '@/lib/content';
import type { Education, Experience } from '@/types/api';

interface Props {
  experiences: Experience[];
  education: Education[];
}

type Entry = {
  id: string;
  kind: 'experience' | 'education';
  title: string;
  place: string;
  period: string;
  sortKey: number;
  description: string;
  bullets: string[];
};

/**
 * Parcours : expériences et formation sur une même ligne du temps, la plus
 * récente en haut. La ligne s'allume au fil de la lecture, et les entrées
 * alternent de part et d'autre sur grand écran.
 */
export default function TimelineSection({ experiences, education }: Props) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const entries: Entry[] = [
    ...experiences.map((exp) => ({
      id: exp.id,
      kind: 'experience' as const,
      title: text(exp.role),
      place: [exp.company, exp.location].filter(Boolean).join(', '),
      period: period(exp.startDate, exp.endDate, exp.isCurrent),
      sortKey: new Date(exp.startDate).getTime(),
      description: text(exp.description),
      bullets: list(exp.achievements),
    })),
    ...education.map((edu) => ({
      id: edu.id,
      kind: 'education' as const,
      title: text(edu.degree),
      place: [edu.school, edu.location].filter(Boolean).join(', '),
      period: period(edu.startDate, edu.endDate, edu.isCurrent),
      sortKey: new Date(edu.startDate).getTime(),
      description: text(edu.description),
      bullets: [],
    })),
  ].sort((a, b) => b.sortKey - a.sortKey);

  if (entries.length === 0) {
    return <p className="text-haze">Parcours à renseigner depuis l&apos;administration.</p>;
  }

  return (
    <ol ref={ref} className="relative space-y-10">
      {/* Rail et sa partie allumée */}
      <div aria-hidden className="absolute bottom-0 left-5 top-0 w-px bg-rule md:left-1/2" />
      <motion.div
        aria-hidden
        style={{ scaleY }}
        className="absolute bottom-0 left-5 top-0 w-px origin-top bg-gradient-to-b from-cyan via-signal to-violet shadow-[0_0_10px_var(--cyan)] md:left-1/2"
      />

      {entries.map((entry, index) => {
        const Icon = entry.kind === 'experience' ? Briefcase : GraduationCap;
        const right = index % 2 === 1;

        return (
          <li key={`${entry.kind}-${entry.id}`} className="relative grid md:grid-cols-2 md:gap-14">
            <span className="neon-ring absolute left-5 top-5 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full text-cyan md:left-1/2">
              <Icon className="h-4 w-4" />
            </span>

            <Reveal
              direction={right ? 'left' : 'right'}
              className={`pl-14 md:pl-0 ${right ? 'md:col-start-2' : 'md:col-start-1 md:text-right'}`}
            >
              <div className="glass glass-hover p-5 text-left">
                <p className="font-mono text-xs text-cyan">{entry.period}</p>
                <h3 className="mt-1.5 font-display text-lg font-semibold text-ink">{entry.title}</h3>
                <p className="text-sm text-graphite">{entry.place}</p>

                {entry.description && (
                  <p className="mt-3 text-sm leading-relaxed text-haze">{entry.description}</p>
                )}

                {entry.bullets.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {entry.bullets.map((bullet, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan" />
                        <span className="text-sm leading-relaxed text-haze">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          </li>
        );
      })}
    </ol>
  );
}
