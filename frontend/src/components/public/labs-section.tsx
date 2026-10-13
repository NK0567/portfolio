import Link from 'next/link';
import { ArrowUpRight, Flag } from 'lucide-react';
import Reveal from './fx/reveal';
import { text, monthYear } from '@/lib/content';
import { LAB_DIFFICULTY_LABELS, LAB_PLATFORM_LABELS, type CyberLab } from '@/types/api';

interface Props {
  labs: CyberLab[];
}

const DIFFICULTY_TONE: Record<string, string> = {
  Easy: 'text-success border-success/30 bg-success/10',
  Medium: 'text-amber-300 border-amber-300/30 bg-amber-300/10',
  Hard: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  Insane: 'text-red-400 border-red-400/30 bg-red-400/10',
};

/**
 * Labs de sécurité publiés, en cartes. Chacune mène au write-up complet
 * hébergé sur le site.
 */
export default function LabsSection({ labs }: Props) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {labs.map((lab, index) => (
        <Reveal as="li" key={lab.id} delay={index * 0.06}>
          <Link href={`/labs/${lab.slug}`} className="glass glass-hover group flex h-full flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="neon-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-cyan">
                  <Flag className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display font-semibold text-ink group-hover:text-cyan">{lab.title}</h3>
                  <p className="text-xs text-haze">
                    {LAB_PLATFORM_LABELS[lab.platform] ?? lab.platform} · {monthYear(lab.completedAt)}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-haze transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan" />
            </div>

            <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-haze">{text(lab.summary)}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${DIFFICULTY_TONE[lab.difficulty] ?? ''}`}>
                {LAB_DIFFICULTY_LABELS[lab.difficulty] ?? lab.difficulty}
              </span>
              {lab.category && <span className="chip">{lab.category}</span>}
              {lab.techniques.slice(0, 2).map((t) => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
          </Link>
        </Reveal>
      ))}
    </ul>
  );
}
