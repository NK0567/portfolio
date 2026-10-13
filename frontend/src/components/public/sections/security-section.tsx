"use client";

import { motion } from 'framer-motion';
import { Activity, KeyRound, Lock, Network, ShieldCheck, type LucideIcon } from 'lucide-react';
import Section from '../section';
import Reveal from '../fx/reveal';
import LabsSection from '../labs-section';
import { ShieldVisual } from '../three/lazy';
import type { CyberLab } from '@/types/api';

interface Props {
  /** Compétences de la catégorie Cybersécurité. */
  skills: string[];
  labs: CyberLab[];
}

/*
 * Chaque ligne décrit une protection réellement en place sur ce site.
 * Un recruteur technique peut vérifier : en-têtes HTTP, cookies, réponses
 * 429 après quelques essais de connexion ratés.
 */
const PILLARS: Array<{ icon: LucideIcon; title: string; items: string[] }> = [
  { icon: Lock, title: 'Chiffrement', items: ['bcrypt, 12 tours', 'TLS de bout en bout', 'Secrets validés au démarrage'] },
  { icon: Network, title: 'Réseau', items: ['Helmet et CORS stricts', 'Limitation de débit', 'Proxy de confiance borné'] },
  { icon: KeyRound, title: "Contrôle d'accès", items: ['JWT en mémoire', 'Refresh token httpOnly rotatif', 'Rôles (RBAC)'] },
  { icon: Activity, title: 'Surveillance', items: ["Journal d'audit des actions", 'Erreurs masquées au client', 'Validation Zod partout'] },
];

function Pillar({ pillar, index }: { pillar: (typeof PILLARS)[number]; index: number }) {
  const Icon = pillar.icon;
  return (
    <Reveal delay={index * 0.1} direction={index % 2 === 0 ? 'right' : 'left'}>
      <div className="glass glass-hover p-5">
        <div className="flex items-center gap-3">
          <span className="neon-ring flex h-10 w-10 items-center justify-center rounded-xl text-cyan">
            <Icon className="h-5 w-5" />
          </span>
          <p className="font-display font-semibold text-ink">{pillar.title}</p>
        </div>
        <ul className="mt-4 space-y-2">
          {pillar.items.map((item, i) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + index * 0.1 + i * 0.12 }}
              className="flex items-center gap-2 text-sm text-graphite"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" />
              {item}
            </motion.li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

/**
 * Sécurité des applications.
 *
 * Le bouclier 3D au centre, quatre piliers autour, puis les labs. Le
 * message est simple : la sécurité n'est pas une ligne du CV, elle est
 * appliquée dans le site même que le recruteur est en train de lire.
 */
export default function SecuritySection({ skills, labs }: Props) {
  return (
    <Section
      id="securite"
      eyebrow="Cybersécurité"
      title="Sécurité des applications"
      intro="Formé à la sécurité des systèmes d'information, je protège les données dès la conception. Ce site applique lui-même chacune de ces mesures."
    >
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.15fr_1fr]">
        <div className="order-2 space-y-5 lg:order-1">
          <Pillar pillar={PILLARS[0]!} index={0} />
          <Pillar pillar={PILLARS[1]!} index={1} />
        </div>

        <Reveal className="relative order-1 h-[360px] sm:h-[460px] lg:order-2">
          <div aria-hidden className="absolute inset-12 rounded-full bg-signal/25 blur-[80px]" />
          <ShieldVisual />
        </Reveal>

        <div className="order-3 space-y-5">
          <Pillar pillar={PILLARS[2]!} index={2} />
          <Pillar pillar={PILLARS[3]!} index={3} />
        </div>
      </div>

      {skills.length > 0 && (
        <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {skills.map((skill) => (
            <span key={skill} className="chip">{skill}</span>
          ))}
        </Reveal>
      )}

      {labs.length > 0 && (
        <div id="labs" className="mt-20">
          <Reveal>
            <p className="eyebrow">Labs offensifs</p>
            <h3 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
              Machines résolues, démarche complète
            </h3>
            <p className="mt-3 max-w-[62ch] text-haze">
              Reconnaissance, exploitation, élévation de privilèges, et surtout la correction recommandée pour
              chaque faille.
            </p>
          </Reveal>
          <div className="mt-8">
            <LabsSection labs={labs} />
          </div>
        </div>
      )}
    </Section>
  );
}
