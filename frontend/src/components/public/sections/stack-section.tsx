"use client";

import { motion } from 'framer-motion';
import { Hand } from 'lucide-react';
import Section from '../section';
import Reveal from '../fx/reveal';
import { OrbitVisual } from '../three/lazy';
import { SKILL_CATEGORY_LABELS, type Skill, type SkillCategory } from '@/types/api';

interface Props {
  skills: Skill[];
}

/**
 * Orbite 3D des technologies principales.
 *
 * Seules les douze mieux maîtrisées tournent dans la scène : au-delà, les
 * étiquettes se chevauchent et plus rien n'est lisible. La liste complète
 * est dans la section Compétences, juste en dessous.
 */
export default function StackSection({ skills }: Props) {
  const top = [...skills]
    .sort((a, b) => b.level - a.level || b.yearsOfExp - a.yearsOfExp)
    .slice(0, 12)
    .map((s) => ({ name: s.name, level: s.level, years: s.yearsOfExp }));

  const byCategory = new Map<SkillCategory, Skill[]>();
  for (const skill of skills) byCategory.set(skill.category, [...(byCategory.get(skill.category) ?? []), skill]);

  const domains = [...byCategory.entries()]
    .map(([category, items]) => ({
      category,
      count: items.length,
      average: Math.round(items.reduce((sum, s) => sum + s.level, 0) / items.length),
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 5);

  if (skills.length === 0) return null;

  return (
    <Section
      id="stack"
      eyebrow="Tech stack"
      title="Ma galaxie technologique"
      intro="Les outils avec lesquels je construis au quotidien, du terminal à la production. Fais tourner l'orbite pour les voir de près."
    >
      <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="glass relative h-[420px] overflow-hidden sm:h-[520px]">
          <OrbitVisual items={top} />
          <p className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-xs text-haze sm:inline-flex">
            <Hand className="h-4 w-4 text-cyan" />
            Glisser pour faire tourner · survoler une technologie pour le détail
          </p>
        </Reveal>

        <div className="space-y-3">
          {domains.map((domain, index) => (
            <Reveal key={domain.category} delay={index * 0.08} direction="left">
              <div className="glass glass-hover p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display font-semibold text-ink">{SKILL_CATEGORY_LABELS[domain.category]}</p>
                  <p className="font-mono text-xs text-haze">
                    {domain.count} techno{domain.count > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-rule">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-signal via-cyan to-violet"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${domain.average}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.2 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="mt-1.5 text-right font-mono text-[11px] text-cyan">maîtrise moyenne {domain.average}%</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
