"use client";

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  Container,
  Database,
  GitBranch,
  Infinity as InfinityIcon,
  Play,
  RotateCcw,
  Server,
  type LucideIcon,
} from 'lucide-react';
import Section from '../section';
import Reveal from '../fx/reveal';

interface Props {
  /** Outils DevOps et Cloud saisis dans l'administration. */
  tools: string[];
}

const STAGES: Array<{ icon: LucideIcon; label: string; step: string; log: string }> = [
  { icon: GitBranch, label: 'Git', step: 'Commit', log: 'git push origin main' },
  { icon: InfinityIcon, label: 'CI', step: 'Build & tests', log: 'Typecheck et build réussis' },
  { icon: Container, label: 'Docker', step: 'Conteneur', log: 'Image construite, utilisateur non-root' },
  { icon: Server, label: 'Serveur', step: 'Déploiement', log: 'Migrations Prisma appliquées' },
  { icon: Database, label: 'Production', step: 'En ligne', log: 'Application en ligne, santé OK' },
];

const STEP_MS = 1100;

/**
 * Chaîne de déploiement animée.
 *
 * Une impulsion parcourt les étapes, chacune s'allume à son passage et la
 * console affiche ce qui s'y passe. Les étapes décrivent ce que fait
 * réellement le déploiement de ce portfolio : Dockerfile multi-étapes,
 * migrations appliquées au démarrage, contrôle de santé.
 */
export default function PipelineSection({ tools }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(-1);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setStep(STAGES.length);
      return;
    }
    setStep(0);
    const timer = setInterval(() => {
      setStep((s) => {
        if (s >= STAGES.length) {
          clearInterval(timer);
          return s;
        }
        return s + 1;
      });
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [inView, run, reduce]);

  const done = step >= STAGES.length;
  const progress = Math.max(0, Math.min(1, step / (STAGES.length - 1)));

  return (
    <Section
      id="devops"
      eyebrow="DevOps & Cloud"
      title="Du commit à la production"
      intro="Je ne m'arrête pas au code : je le conteneurise, je le déploie et je le surveille. Voici la chaîne que suit ce portfolio."
      action={
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          disabled={!done}
          className="btn-ghost disabled:opacity-40"
        >
          {done ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {done ? 'Relancer le pipeline' : 'Pipeline en cours…'}
        </button>
      }
    >
      <div ref={ref} className="space-y-6">
        <Reveal className="glass px-4 py-10 sm:px-10">
          <div className="relative">
            {/* Rail + progression */}
            <div className="absolute left-[10%] right-[10%] top-7 h-0.5 bg-rule sm:top-9" />
            <motion.div
              className="absolute left-[10%] top-7 h-0.5 bg-gradient-to-r from-cyan via-signal to-violet shadow-[0_0_12px_var(--cyan)] sm:top-9"
              animate={{ width: `${progress * 80}%` }}
              transition={{ duration: STEP_MS / 1000, ease: 'easeInOut' }}
            />

            <ol className="relative grid grid-cols-5 gap-2">
              {STAGES.map((stage, i) => {
                const lit = step >= i;
                const current = step === i;
                const Icon = stage.icon;
                return (
                  <li key={stage.label} className="flex flex-col items-center text-center">
                    <motion.div
                      animate={current && !reduce ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                      transition={{ duration: 0.6 }}
                      className={[
                        'relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-500 sm:h-[4.5rem] sm:w-[4.5rem]',
                        lit
                          ? 'border-cyan/60 bg-signal/20 text-ink shadow-[0_0_30px_-4px_var(--signal)]'
                          : 'border-rule bg-paper text-haze',
                      ].join(' ')}
                    >
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                      {lit && step > i && (
                        <CheckCircle2 className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-paper text-success" />
                      )}
                    </motion.div>
                    <p className={`mt-3 text-xs font-semibold sm:text-sm ${lit ? 'text-ink' : 'text-haze'}`}>{stage.label}</p>
                    <p className="mt-0.5 hidden text-[11px] text-haze sm:block">{stage.step}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* Console */}
          <Reveal className="glass min-h-[220px] p-5 font-mono text-[12.5px] leading-7">
            <p className="mb-2 text-xs text-haze">deploy.log</p>
            <AnimatePresence initial={false}>
              {STAGES.slice(0, Math.max(0, Math.min(step + 1, STAGES.length))).map((stage, i) => (
                <motion.p
                  key={`${run}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={i === STAGES.length - 1 && done ? 'text-success' : 'text-graphite'}
                >
                  <span className="text-success">✓</span> {stage.log}
                </motion.p>
              ))}
            </AnimatePresence>
            {done ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-cyan">
                ● Application is running.
              </motion.p>
            ) : (
              <p className="text-haze">
                <span className="animate-blink">▌</span>
              </p>
            )}
          </Reveal>

          {/* Outils réels */}
          <Reveal delay={0.1} direction="left" className="glass p-5">
            <p className="font-display font-semibold text-ink">Dans ma boîte à outils</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Docker', 'Docker Compose', ...tools].filter((t, i, all) => all.indexOf(t) === i).map((tool) => (
                <span key={tool} className="chip">{tool}</span>
              ))}
            </div>
            <ul className="mt-5 space-y-2 text-sm text-haze">
              <li className="flex gap-2"><span className="text-cyan">›</span> Images multi-étapes, exécution sans droits root</li>
              <li className="flex gap-2"><span className="text-cyan">›</span> Migrations de base versionnées et rejouables</li>
              <li className="flex gap-2"><span className="text-cyan">›</span> Secrets hors du code, validés au démarrage</li>
            </ul>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
