"use client";

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Cloud,
  Code2,
  Database,
  Monitor,
  MousePointerClick,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import Section from '../section';
import Reveal from '../fx/reveal';
import { SKILL_CATEGORY_LABELS, type Skill, type SkillCategory } from '@/types/api';

interface Props {
  skills: Skill[];
}

const ICONS: Record<SkillCategory, LucideIcon> = {
  FRONTEND: Monitor,
  BACKEND: Server,
  MOBILE: Smartphone,
  DATABASE: Database,
  DEVOPS: Workflow,
  CLOUD: Cloud,
  CYBERSECURITY: ShieldCheck,
  OTHER: Sparkles,
};

const ORDER: SkillCategory[] = ['FRONTEND', 'BACKEND', 'DATABASE', 'CYBERSECURITY', 'DEVOPS', 'CLOUD', 'MOBILE', 'OTHER'];

const W = 800;
const H = 520;
const CX = W / 2;
const CY = H / 2;

/** Poussière de fond : positions pseudo-aléatoires, identiques à chaque rendu. */
const DUST = Array.from({ length: 46 }, (_, i) => ({
  x: ((i * 7919) % 997) / 997 * W,
  y: ((i * 104729) % 991) / 991 * H,
  r: 1 + (i % 3) * 0.6,
}));

/**
 * Réseau de compétences.
 *
 * Chaque domaine est un nœud relié au noyau, les connexions s'animent en
 * continu. Cliquer (ou survoler) un domaine affiche ses technologies avec
 * leur niveau et leurs années de pratique : la vue d'ensemble d'abord, le
 * détail à la demande.
 */
export default function SkillNetwork({ skills }: Props) {
  const groups = useMemo(() => {
    const map = new Map<SkillCategory, Skill[]>();
    for (const skill of skills) map.set(skill.category, [...(map.get(skill.category) ?? []), skill]);
    return ORDER.filter((c) => map.has(c)).map((category) => ({
      category,
      items: (map.get(category) ?? []).sort((a, b) => b.level - a.level),
    }));
  }, [skills]);

  const [selected, setSelected] = useState<SkillCategory | null>(groups[0]?.category ?? null);

  const nodes = groups.map((group, i) => {
    const angle = (i / groups.length) * Math.PI * 2 - Math.PI / 2;
    return { ...group, x: CX + Math.cos(angle) * 300, y: CY + Math.sin(angle) * 190 };
  });

  if (groups.length === 0) return null;

  const current = groups.find((g) => g.category === selected) ?? groups[0]!;

  return (
    <Section
      id="competences"
      eyebrow="Skill network"
      title="Mes compétences"
      intro="Un ensemble cohérent, du pixel à la base de données. Sélectionne un domaine pour voir le détail."
      action={
        <p className="inline-flex items-center gap-2 text-sm text-haze">
          <MousePointerClick className="h-4 w-4 text-cyan" />
          Survole un nœud
        </p>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <Reveal className="glass relative overflow-hidden p-2">
          <div className="relative aspect-[800/520] w-full">
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <linearGradient id="link" x1="0" x2="1">
                  <stop offset="0" stopColor="var(--cyan)" />
                  <stop offset="1" stopColor="var(--violet)" />
                </linearGradient>
                <radialGradient id="core-glow">
                  <stop offset="0" stopColor="var(--signal)" stopOpacity="0.55" />
                  <stop offset="1" stopColor="var(--signal)" stopOpacity="0" />
                </radialGradient>
              </defs>

              {DUST.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--signal)" opacity={0.35} />
              ))}
              {DUST.slice(0, 30).map((d, i) => {
                const n = DUST[(i * 7 + 3) % DUST.length]!;
                return <line key={`d${i}`} x1={d.x} y1={d.y} x2={n.x} y2={n.y} stroke="var(--signal)" strokeOpacity={0.08} />;
              })}

              <circle cx={CX} cy={CY} r={120} fill="url(#core-glow)" />

              {/* Liens entre domaines voisins */}
              {nodes.map((node, i) => {
                const next = nodes[(i + 1) % nodes.length]!;
                return (
                  <line key={`r${i}`} x1={node.x} y1={node.y} x2={next.x} y2={next.y} stroke="var(--signal)" strokeOpacity={0.18} />
                );
              })}

              {/* Liens noyau -> domaine, avec flux animé */}
              {nodes.map((node) => {
                const active = node.category === current.category;
                return (
                  <g key={node.category}>
                    <line x1={CX} y1={CY} x2={node.x} y2={node.y} stroke="url(#link)" strokeOpacity={active ? 0.9 : 0.35} strokeWidth={active ? 2 : 1.2} />
                    <line
                      x1={CX}
                      y1={CY}
                      x2={node.x}
                      y2={node.y}
                      stroke="var(--cyan)"
                      strokeWidth={active ? 2.5 : 1.5}
                      strokeDasharray="4 36"
                      strokeLinecap="round"
                      style={{ animation: `dash-flow ${active ? 0.9 : 1.8}s linear infinite` }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Noyau */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(CX / W) * 100}%`, top: `${(CY / H) * 100}%` }}
            >
              <div className="neon-ring flex h-16 w-16 items-center justify-center rounded-2xl text-cyan sm:h-20 sm:w-20 animate-float">
                <Code2 className="h-8 w-8 sm:h-9 sm:w-9" />
              </div>
            </div>

            {/* Domaines */}
            {nodes.map((node, i) => {
              const Icon = ICONS[node.category];
              const active = node.category === current.category;
              return (
                <motion.button
                  key={node.category}
                  type="button"
                  initial={{ opacity: 0, scale: 0.4 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 200, damping: 16 }}
                  onClick={() => setSelected(node.category)}
                  onMouseEnter={() => setSelected(node.category)}
                  aria-pressed={active}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
                  style={{ left: `${(node.x / W) * 100}%`, top: `${(node.y / H) * 100}%` }}
                >
                  <span
                    className={[
                      'neon-ring flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 sm:h-14 sm:w-14',
                      active ? 'scale-110 text-ink shadow-[0_0_40px_-2px_var(--cyan)]' : 'text-graphite',
                    ].join(' ')}
                  >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <span className={`hidden whitespace-nowrap text-xs font-semibold sm:block ${active ? 'text-ink' : 'text-haze'}`}>
                    {SKILL_CATEGORY_LABELS[node.category]}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </Reveal>

        {/* Détail du domaine sélectionné */}
        <Reveal delay={0.1} direction="left" className="min-w-0">
          <div className="glass h-full p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.category}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.3 }}
              >
                <p className="eyebrow">{current.items.length} technologies</p>
                <h3 className="mt-2 font-display text-2xl font-bold text-ink">
                  {SKILL_CATEGORY_LABELS[current.category]}
                </h3>
                <ul className="mt-6 space-y-4">
                  {current.items.map((skill, i) => (
                    <li key={skill.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-ink">{skill.name}</span>
                        <span className="shrink-0 font-mono text-[11px] text-haze">
                          {skill.yearsOfExp > 0 && `${skill.yearsOfExp} an${skill.yearsOfExp > 1 ? 's' : ''} · `}
                          {skill.level}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-rule">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-signal via-cyan to-violet"
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.level}%` }}
                          transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
