"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Keyboard, TerminalSquare } from 'lucide-react';
import Section from '../section';
import Reveal from '../fx/reveal';

interface Props {
  fullName: string;
  headline: string;
  email: string | null;
  available: boolean;
  skills: string[];
  projects: Array<{ title: string; slug: string }>;
  cvUrl: string;
}

/* ------------------------------------------------------------------------ */
/* Extraits de code                                                          */
/* ------------------------------------------------------------------------ */

/*
 * Les extraits Backend et Frontend sont tirés de ce portfolio (route des
 * labs avec authentification facultative, rendu serveur de l'accueil).
 * L'extrait Mobile illustre le style de code Flutter : à remplacer par un
 * vrai fichier de UniPay pour qu'il soit lui aussi authentique.
 */
const SNIPPETS = {
  backend: {
    file: 'lab.controller.ts',
    code: `// GET /api/labs : brouillons visibles pour l'admin seulement
export const getAllLabs = async (req: Request, res: Response) => {
  const admin = isAdminRequest(req);

  const labs = await prisma.cyberLab.findMany({
    where: admin ? {} : { isPublished: true },
    orderBy: [{ order: 'asc' }, { completedAt: 'desc' }],
  });

  res.status(200).json({ success: true, data: labs });
};

router.get('/', optionalAuth, getAllLabs);
router.post('/', protect, authorize('ADMIN'), writeLimiter,
  validateBody(createLabSchema), createLab);`,
  },
  frontend: {
    file: 'page.tsx',
    code: `// Rendu serveur : Google reçoit une page complète
export const revalidate = 60;

export default async function HomePage() {
  const [profile, projects, skills] = await Promise.all([
    getPublic<Profile>('/profile'),
    getPublic<Project[]>('/projects'),
    getPublic<Skill[]>('/skills'),
  ]);

  return (
    <main>
      <Hero profile={profile} />
      <ProjectsShowcase projects={projects ?? []} />
    </main>
  );
}`,
  },
  mobile: {
    file: 'wallet_screen.dart',
    code: `// Solde multi-devises, mis à jour en temps réel
class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balances = ref.watch(balancesProvider);

    return balances.when(
      data: (items) => ListView.builder(
        itemCount: items.length,
        itemBuilder: (_, i) => BalanceCard(items[i]),
      ),
      loading: () => const ShimmerList(),
      error: (e, _) => ErrorView(message: e.toString()),
    );
  }
}`,
  },
} as const;

type Tab = keyof typeof SNIPPETS;

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'backend', label: 'Backend' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'mobile', label: 'Mobile' },
];

const KEYWORDS = new Set([
  'export', 'const', 'async', 'await', 'return', 'function', 'default', 'import', 'from',
  'class', 'extends', 'final', 'new', 'if', 'else', 'super', 'Widget', 'override',
]);

/**
 * Coloration syntaxique minimale : commentaires, chaînes, mots-clés,
 * nombres, appels de fonction. Suffisant pour des extraits courts, sans
 * embarquer une bibliothèque de 200 Ko.
 */
const highlight = (source: string): React.ReactNode[] => {
  const pattern =
    /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'?|`[^`]*`?)|(\b\d+\b)|(\b[A-Za-z_]\w*\b)(?=\s*[(<])|(\b[A-Za-z_]\w*\b)|([{}()[\]])/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(source))) {
    if (match.index > last) out.push(source.slice(last, match.index));
    const [token, comment, str, num, call, word, punct] = match;
    const cls = comment
      ? 'tok-c'
      : str
        ? 'tok-s'
        : num
          ? 'tok-n'
          : call
            ? KEYWORDS.has(call) ? 'tok-k' : 'tok-f'
            : word
              ? KEYWORDS.has(word) ? 'tok-k' : undefined
              : punct
                ? 'tok-p'
                : undefined;
    out.push(cls ? <span key={key++} className={cls}>{token}</span> : token);
    last = match.index + token.length;
  }
  if (last < source.length) out.push(source.slice(last));
  return out;
};

/* ------------------------------------------------------------------------ */
/* Éditeur avec frappe animée                                                */
/* ------------------------------------------------------------------------ */

function CodeEditor() {
  const [tab, setTab] = useState<Tab>('backend');
  const [typed, setTyped] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-15% 0px' });
  const reduce = useReducedMotion();

  const { code, file } = SNIPPETS[tab];

  useEffect(() => {
    if (!inView || typed >= code.length) return;
    if (reduce) {
      setTyped(code.length);
      return;
    }
    const timer = setTimeout(() => setTyped((n) => Math.min(code.length, n + 3)), 14);
    return () => clearTimeout(timer);
  }, [inView, typed, code.length, reduce]);

  const visible = code.slice(0, typed);
  const lines = useMemo(() => code.split('\n').length, [code]);

  return (
    <div ref={ref} className="glass overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-signal/15 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 font-mono text-xs text-haze">{file}</span>
        </div>
        <div className="flex rounded-full border border-rule p-0.5" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setTyped(0);
              }}
              className={[
                'relative rounded-full px-3 py-1 text-xs transition-colors',
                tab === t.id ? 'text-ink' : 'text-haze hover:text-ink',
              ].join(' ')}
            >
              {tab === t.id && (
                <motion.span layoutId="code-tab" className="absolute inset-0 -z-10 rounded-full bg-signal/25" />
              )}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-[420px] overflow-x-auto font-mono text-[12.5px] leading-6">
        <div aria-hidden className="select-none border-r border-signal/10 px-3 py-4 text-right text-haze/50">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="flex-1 px-4 py-4 text-graphite">
          <code>
            {highlight(visible)}
            <span className="ml-px inline-block h-4 w-[7px] translate-y-[3px] bg-cyan/80 animate-blink" />
          </code>
        </pre>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Terminal interactif                                                        */
/* ------------------------------------------------------------------------ */

type Line = { kind: 'cmd' | 'out' | 'ok' | 'err' | 'link'; text: string; href?: string };

const BOOT: Line[] = [
  { kind: 'cmd', text: 'npm install' },
  { kind: 'out', text: 'added 412 packages in 6s' },
  { kind: 'cmd', text: 'npx prisma migrate deploy' },
  { kind: 'ok', text: '✓ All migrations have been successfully applied.' },
  { kind: 'cmd', text: 'npm run dev' },
  { kind: 'ok', text: '✓ API prête sur http://localhost:8080' },
  { kind: 'out', text: "Tape « help » pour discuter avec ce terminal." },
];

function Terminal({ fullName, headline, email, available, skills, projects, cvUrl }: Props) {
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const inView = useInView(box, { once: true, margin: '-15% 0px' });
  const reduce = useReducedMotion();

  // Séquence de démarrage, une ligne après l'autre.
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setLines(BOOT);
      return;
    }
    let i = 0;
    const timer = setInterval(() => {
      const next = BOOT[i];
      i += 1;
      if (next) setLines((l) => [...l, next]);
      if (i >= BOOT.length) clearInterval(timer);
    }, 380);
    return () => clearInterval(timer);
  }, [inView, reduce]);

  useEffect(() => {
    const el = box.current?.querySelector('[data-scroll]');
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const run = (raw: string) => {
    const command = raw.trim().toLowerCase();
    const out: Line[] = [{ kind: 'cmd', text: raw }];

    switch (command) {
      case '':
        break;
      case 'help':
        out.push({ kind: 'out', text: 'whoami · stack · projets · contact · cv · dispo · clear · sudo embaucher' });
        break;
      case 'whoami':
        out.push({ kind: 'ok', text: `${fullName} — ${headline}` });
        break;
      case 'stack':
      case 'skills':
        out.push({ kind: 'out', text: skills.slice(0, 14).join(' · ') || 'Stack en cours de mise à jour.' });
        break;
      case 'projets':
      case 'projects':
      case 'ls':
        if (projects.length === 0) out.push({ kind: 'out', text: 'Aucun projet publié.' });
        projects.forEach((p) => out.push({ kind: 'link', text: `→ ${p.title}`, href: `/projects/${p.slug}` }));
        break;
      case 'contact':
        out.push(
          email
            ? { kind: 'link', text: `✉ ${email}`, href: `mailto:${email}` }
            : { kind: 'link', text: '→ Formulaire de contact', href: '#contact' }
        );
        break;
      case 'cv':
        out.push({ kind: 'link', text: '↓ Télécharger le CV (PDF)', href: cvUrl });
        break;
      case 'dispo':
      case 'disponibilite':
        out.push(
          available
            ? { kind: 'ok', text: '● Disponible pour un poste ou une mission.' }
            : { kind: 'out', text: 'En poste, mais ouvert aux propositions.' }
        );
        break;
      case 'clear':
        setLines([]);
        return;
      case 'sudo embaucher':
      case 'sudo hire':
        out.push({ kind: 'ok', text: '[sudo] Permission accordée. Ouverture du formulaire de contact…' });
        setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 900);
        break;
      case 'rm -rf /':
        out.push({ kind: 'err', text: "Bien essayé. Ce terminal est en lecture seule, comme il se doit." });
        break;
      default:
        out.push({ kind: 'err', text: `commande introuvable : ${command}. Tape « help ».` });
    }

    setLines((l) => [...l, ...out]);
  };

  const color: Record<Line['kind'], string> = {
    cmd: 'text-ink',
    out: 'text-graphite',
    ok: 'text-success',
    err: 'text-red-400',
    link: 'text-cyan hover:underline',
  };

  return (
    <div ref={box} className="glass flex h-full flex-col overflow-hidden" onClick={() => field.current?.focus()}>
      <div className="flex items-center gap-2 border-b border-signal/15 px-4 py-2.5">
        <TerminalSquare className="h-4 w-4 text-cyan" />
        <span className="font-mono text-xs text-haze">terminal — zsh</span>
      </div>
      <div data-scroll className="h-[300px] flex-1 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-6 lg:h-auto">
        {lines.map((line, i) =>
          line.kind === 'cmd' ? (
            <p key={i} className={color.cmd}>
              <span className="text-violet">$</span> {line.text}
            </p>
          ) : line.href ? (
            <p key={i}>
              <a
                href={line.href}
                className={color.link}
                {...(line.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {line.text}
              </a>
            </p>
          ) : (
            <p key={i} className={color[line.kind]}>
              {line.text}
            </p>
          )
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
            if (input.trim()) setHistory((h) => [input, ...h].slice(0, 20));
            setInput('');
            setCursor(-1);
          }}
          className="flex items-center gap-2"
        >
          <span className="text-violet">$</span>
          <input
            ref={field}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp' && history.length) {
                e.preventDefault();
                const next = Math.min(history.length - 1, cursor + 1);
                setCursor(next);
                setInput(history[next] ?? '');
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = Math.max(-1, cursor - 1);
                setCursor(next);
                setInput(next === -1 ? '' : (history[next] ?? ''));
              }
            }}
            aria-label="Commande du terminal"
            autoComplete="off"
            spellCheck={false}
            placeholder={lines.length >= BOOT.length ? 'help' : ''}
            className="flex-1 bg-transparent text-ink caret-cyan outline-none placeholder:text-haze/40"
          />
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

export default function CodeSection(props: Props) {
  return (
    <Section
      id="code"
      eyebrow="Code motion"
      title="Le code, en direct"
      intro="Des extraits de ce portfolio et de mes applications, écrits sous tes yeux. Et un terminal qui répond vraiment : essaie « whoami » ou « projets »."
      action={
        <p className="inline-flex items-center gap-2 text-sm text-haze">
          <Keyboard className="h-4 w-4 text-cyan" />
          Tape dans le terminal
        </p>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Reveal className="min-w-0">
          <CodeEditor />
        </Reveal>
        <Reveal delay={0.12} direction="left" className="min-w-0">
          <Terminal {...props} />
        </Reveal>
      </div>
    </Section>
  );
}
