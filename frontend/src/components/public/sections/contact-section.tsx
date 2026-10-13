"use client";

import type React from 'react';
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Mail, MessageCircle, Phone } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '@/components/icons/brand-icons';
import Section from '../section';
import Reveal from '../fx/reveal';
import ContactForm from '../contact-form';

interface Props {
  email: string | null;
  phone: string | null;
  github: string | null;
  linkedin: string | null;
  whatsapp: string | null;
}

/** Particules lumineuses autour de la porte (positions fixes, pas d'aléatoire au rendu). */
const SPARKS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 90,
  size: 2 + (i % 3),
  delay: (i % 7) * 0.6,
}));

/**
 * Le portail : une porte de lumière ouverte sur une ville au crépuscule,
 * posée sur un sol réfléchissant. Tout en CSS 3D et SVG : une quatrième
 * scène WebGL n'apporterait rien que la perspective CSS ne fasse.
 */
function Portal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const reduce = useReducedMotion();
  const open = inView || !!reduce;

  return (
    <div ref={ref} className="relative mx-auto h-[420px] w-full max-w-[360px] [perspective:1200px] sm:h-[480px]">
      {/* Sol réfléchissant en perspective */}
      <div className="absolute inset-x-[-40%] bottom-0 h-40 [perspective:400px]" aria-hidden>
        <div
          className="absolute inset-0 origin-bottom [transform:rotateX(62deg)]"
          style={{
            backgroundImage:
              'linear-gradient(to right, color-mix(in oklab, var(--cyan) 30%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--cyan) 30%, transparent) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            maskImage: 'radial-gradient(ellipse 60% 90% at 50% 100%, #000 20%, transparent 75%)',
          }}
        />
      </div>
      <motion.div
        aria-hidden
        className="absolute bottom-4 left-1/2 h-24 w-[130%] -translate-x-1/2 rounded-[100%] bg-cyan/40 blur-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0.2 }}
        transition={{ duration: 1.6, delay: 0.6 }}
      />

      {/* Particules */}
      {SPARKS.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
          animate={reduce ? undefined : { y: [0, -18, 0], opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
        />
      ))}

      {/* Encadrement de la porte */}
      <div className="absolute bottom-10 left-1/2 h-[78%] w-[62%] -translate-x-1/2">
        <div className="absolute -inset-3 rounded-t-[2rem] bg-signal/30 blur-2xl" aria-hidden />
        <div className="absolute inset-0 rounded-t-[1.6rem] border-[3px] border-cyan shadow-[0_0_50px_0_var(--cyan),inset_0_0_40px_-8px_var(--cyan)]">
          {/* La ville au crépuscule, vue à travers la porte */}
          <div className="absolute inset-1.5 overflow-hidden rounded-t-[1.3rem] bg-gradient-to-b from-[#3b1d6e] via-[#7c3aed] to-[#f472b6]">
            <div className="absolute left-1/2 top-[38%] h-24 w-24 -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-200 to-pink-400 opacity-80 blur-[2px]" aria-hidden />
            <svg viewBox="0 0 200 300" preserveAspectRatio="none" className="absolute bottom-0 h-[62%] w-full" aria-hidden>
              <path
                d="M0 300V170h18v-20h10v35h12V120h18v65h8v-40h16v55h10V95h20v100h8v-60h14v70h10v-30h16v40h8V130h18v70h10V160h14v140z"
                fill="#2a1450"
                opacity="0.7"
              />
              <path
                d="M0 300V210h14v-30h12v45h10V160h16v70h8v-40h14v60h10V140h18v95h8v-55h12v65h10v-25h14v35h8V185h16v50h10v-20h20v85z"
                fill="#0b0a24"
              />
              {Array.from({ length: 34 }, (_, i) => (
                <rect
                  key={i}
                  x={8 + ((i * 41) % 184)}
                  y={190 + ((i * 29) % 95)}
                  width="3"
                  height="4"
                  fill={i % 4 === 0 ? '#22d3ee' : '#fde68a'}
                  opacity={0.55 + (i % 3) * 0.15}
                />
              ))}
            </svg>
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.45),transparent_60%)]"
              animate={reduce ? undefined : { opacity: [0.4, 0.85, 0.4] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </div>

          {/* Battant qui s'ouvre vers l'extérieur */}
          <motion.div
            className="absolute inset-1.5 origin-left rounded-t-[1.3rem] border border-signal/60 bg-gradient-to-br from-[#10204a] via-[#0b1638] to-[#060c22]"
            style={{ transformStyle: 'preserve-3d' }}
            initial={{ rotateY: 0 }}
            animate={{ rotateY: open ? -78 : 0 }}
            transition={{ duration: 2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="absolute inset-3 rounded-t-[1rem] border border-cyan/20" />
            <span className="absolute right-4 top-1/2 h-10 w-1.5 -translate-y-1/2 rounded-full bg-cyan shadow-[0_0_14px_var(--cyan)]" />
          </motion.div>
        </div>

        {/* Faisceau de lumière qui sort de la porte et se répand au sol */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 left-1/2 h-20 w-[220%] -translate-x-1/2 bg-gradient-to-b from-pink-300/30 via-cyan/20 to-transparent [clip-path:polygon(35%_0,65%_0,100%_100%,0_100%)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 1.4, delay: 1.1 }}
        />
      </div>
    </div>
  );
}

type Card = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  external: boolean;
};

export default function ContactSection({ email, phone, github, linkedin, whatsapp }: Props) {
  /*
   * GitHub, LinkedIn et l'e-mail sont toujours présents, comme sur la
   * maquette. Un lien non renseigné dans l'écran Site renvoie vers le
   * formulaire plutôt que vers une page vide.
   */
  const cards: Card[] = [
    { href: github ?? '#ecrire', icon: GithubIcon, title: 'GitHub', hint: 'Voir mon profil', external: !!github },
    { href: linkedin ?? '#ecrire', icon: LinkedinIcon, title: 'LinkedIn', hint: 'Connectons-nous', external: !!linkedin },
    { href: email ? `mailto:${email}` : '#ecrire', icon: Mail, title: 'E-mail', hint: email ?? 'Écrire un message', external: false },
    ...(whatsapp ? [{ href: whatsapp, icon: MessageCircle, title: 'WhatsApp', hint: 'Réponse rapide', external: true }] : []),
    ...(phone ? [{ href: `tel:${phone.replace(/\s/g, '')}`, icon: Phone, title: 'Téléphone', hint: phone, external: false }] : []),
  ];

  return (
    <Section
      id="contact"
      eyebrow="Contact"
      title="Prenons contact"
      intro="Une opportunité de plus, un projet de plus. Je réponds sous 48 heures."
    >
      <div className="glass relative overflow-hidden px-6 py-10 sm:px-10">
        <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-signal/20 blur-3xl" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_1.1fr_1fr]">
          {/* Gauche : le message */}
          <Reveal direction="right" className="order-2 text-center lg:order-1 lg:text-left">
            <p className="font-display text-3xl font-semibold leading-snug text-ink sm:text-4xl">
              Une idée,
              <br />
              une collaboration,
              <br />
              <span className="text-gradient">une belle histoire</span>
              <br />
              à construire…
            </p>
            <a href="#ecrire" className="btn-primary mt-8">
              Me contacter
              <ArrowRight className="h-4 w-4" />
            </a>
          </Reveal>

          {/* Centre : le portail */}
          <Reveal className="order-1 lg:order-2">
            <Portal />
          </Reveal>

          {/* Droite : les accès directs, inclinés vers la porte */}
          <ul className="order-3 space-y-4 [perspective:900px]">
            {cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.li
                  key={card.title}
                  initial={{ opacity: 0, x: 40, rotateY: -35 }}
                  whileInView={{ opacity: 1, x: 0, rotateY: -14 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ rotateY: 0, scale: 1.03 }}
                  style={{ transformStyle: 'preserve-3d', marginLeft: `${i * 10}px` }}
                >
                  <a
                    href={card.href}
                    {...(card.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="glass glass-hover group flex items-center gap-4 p-4 shadow-[0_0_30px_-10px_var(--cyan)]"
                  >
                    <span className="neon-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-ink">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-semibold text-ink">{card.title}</span>
                      <span className="block truncate text-xs text-haze">{card.hint}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-haze transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan" />
                  </a>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>

      <Reveal className="glass mt-10 p-6 sm:p-10">
        <div id="ecrire">
          <h3 className="font-display text-xl font-semibold text-ink">Écrire directement</h3>
          <p className="mt-1 text-sm text-haze">Le message arrive dans mon administration, sans intermédiaire.</p>
          <div className="mt-6">
            <ContactForm email={email} />
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
