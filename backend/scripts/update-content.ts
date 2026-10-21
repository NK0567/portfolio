/**
 * Corrige le contenu du portfolio : textes incohérents, faux liens, fautes.
 *
 *   npm run content:update                                        (base locale)
 *   $env:TARGET_DATABASE_URL="mysql://..."; npm run content:update (base en ligne)
 *
 * Relançable sans risque : chaque correction réécrit les mêmes valeurs.
 * Ce qui reste modifiable à la main dans l'administration le reste : ce
 * script ne fait que partir d'une base propre.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const url = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('[contenu] DATABASE_URL ou TARGET_DATABASE_URL requis.');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
const SITE = 'https://boris-kalefack-portfolio.vercel.app';

/*
 * Dates des expériences (format AAAA-MM-JJ). Tant qu'une date vaut null,
 * l'expérience correspondante n'est ni créée ni redatée.
 */
const DATES = {
  escrutin: { start: '2025-08-11' as string | null, end: '2025-11-21' as string | null },
  irex: { start: null as string | null, end: null as string | null },
  afrikedge: { start: '2026-07-27' as string | null },
};

const log = (message: string) => console.log(`  ${message}`);

/* ------------------------------------------------------------------ */

async function fixProfile() {
  const profile = await prisma.profile.findFirst();
  if (!profile) return log('profil absent, ignoré');

  const languages = [
    { name: 'Français', level: 'courant', nameEn: 'French', levelEn: 'fluent' },
    { name: 'Anglais', level: 'scolaire', nameEn: 'English', levelEn: 'basic' },
  ];

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      bio: {
        fr:
          "Développeur full-stack web et mobile (React.js, Next.js, Vue.js, Node.js / NestJS, Flutter). Je conçois des applications de bout en bout, de la base de données à l'interface, jusqu'à leur mise en production. " +
          "Pendant mon stage chez eScrutin, j'ai développé GuidTique, une plateforme qui met en relation touristes et guides locaux. Aujourd'hui, je suis développeur full-stack Vue 3 / NestJS en télétravail pour Afrikedge, une entreprise basée à l'île Maurice, depuis le Cameroun. " +
          "Titulaire d'un master en systèmes d'information et sécurité des communications (SISC), j'aborde l'authentification, la protection des données et le déploiement comme des contraintes de conception, et non comme des correctifs de fin de projet. Ouvert à de nouvelles opportunités, en télétravail ou sur site.",
        en:
          'Full-stack web and mobile developer (React.js, Next.js, Vue.js, Node.js / NestJS, Flutter). I build applications end to end, from the database to the interface, all the way to production. ' +
          'During my internship at eScrutin, I developed GuidTique, a platform connecting tourists with local guides. Today I am a Vue 3 / NestJS full-stack developer working remotely from Cameroon for Afrikedge, a company based in Mauritius. ' +
          "With a master's degree in Information Systems and Communications Security (SISC), I treat authentication, data protection and deployment as design constraints rather than end-of-project fixes. Open to new opportunities, remote or on site.",
      },
      languages,
      titles: {
        fr: ['Développeur Full-Stack', 'Ingénieur logiciel', 'Sécurité des SI & des communications'],
        en: ['Full-Stack Developer', 'Software Engineer', 'Information Systems & Communications Security'],
      },
    },
  });
  log('profil : bio réécrite (FR/EN), langues traduites, titres corrigés');
}

async function fixConfig() {
  const config = await prisma.globalConfig.findFirst();
  if (!config) return log('configuration absente, ignorée');

  await prisma.globalConfig.update({
    where: { id: config.id },
    data: {
      siteName: 'Boris Kalefack Ngouadjeu',
      freelanceStatus: 'Ouvert aux opportunités, en télétravail ou sur site',
      seoConfig: {
        title: {
          fr: 'Boris Kalefack Ngouadjeu, développeur full-stack web et mobile',
          en: 'Boris Kalefack Ngouadjeu, full-stack web and mobile developer',
        },
        description: {
          fr: 'Développeur full-stack web et mobile (React, Next.js, Node.js, Flutter), formé en sécurité informatique. Projets, compétences, parcours et CV.',
          en: 'Full-stack web and mobile developer (React, Next.js, Node.js, Flutter) trained in information security. Projects, skills, experience and resume.',
        },
        keywords: [
          'Boris Kalefack Ngouadjeu',
          'développeur full-stack',
          'développeur web',
          'développeur mobile',
          'Next.js',
          'React',
          'Node.js',
          'NestJS',
          'Flutter',
          'sécurité informatique',
          'télétravail',
          'Cameroun',
        ],
        ogImage: (config.seoConfig as { ogImage?: string } | null)?.ogImage ?? '',
      },
    },
  });
  log('site : nom, statut de disponibilité et référencement Google');
}

async function linkSkills(projectId: string, names: string[]) {
  const skills = await prisma.skill.findMany({ where: { name: { in: names } }, select: { id: true } });
  await prisma.$transaction([
    prisma.projectSkill.deleteMany({ where: { projectId } }),
    prisma.projectSkill.createMany({ data: skills.map((s) => ({ projectId, skillId: s.id })) }),
  ]);
}

async function fixProjects() {
  /*
   * « Admin Console » décrivait en réalité l'administration de ce site, avec
   * de faux liens (github.com, example.com). Il devient le projet Portfolio,
   * avec le vrai lien du site en ligne.
   */
  const portfolio =
    (await prisma.project.findUnique({ where: { slug: 'admin-console' } })) ??
    (await prisma.project.findUnique({ where: { slug: 'portfolio' } }));
  if (portfolio) {
    await prisma.project.update({
      where: { id: portfolio.id },
      data: {
        slug: 'portfolio',
        title: 'Portfolio full-stack et back-office',
        status: 'COMPLETED',
        date: new Date('2026-10-13'),
        order: 0,
        githubUrl: null,
        demoUrl: SITE,
        description: {
          fr: "Ce site : un portfolio rendu côté serveur, avec scènes 3D, piloté par une administration complète qui génère aussi le CV et les lettres de motivation en PDF.",
          en: 'This website: a server-rendered portfolio with 3D scenes, driven by a full admin panel that also generates the resume and cover letters as PDF.',
        },
        content: {
          fr:
            "Frontend Next.js rendu côté serveur, pour que Google et les aperçus de liens reçoivent une page complète. Les scènes 3D (three.js) sont chargées après le texte et mises en pause hors de l'écran.\n\n" +
            "API Express et Prisma sur MySQL : authentification par jeton d'accès en mémoire et cookie de renouvellement à rotation, rôles, limitation de débit, validation de chaque requête et journal d'audit.\n\n" +
            "L'administration gère projets, compétences, parcours, labs de sécurité et messages, et produit le CV et les lettres de motivation en PDF à partir des mêmes données.",
          en:
            'Server-rendered Next.js frontend, so that Google and link previews receive a complete page. The 3D scenes (three.js) load after the text and pause when off screen.\n\n' +
            'Express and Prisma API on MySQL: in-memory access token with a rotating refresh cookie, roles, rate limiting, validation of every request and an audit log.\n\n' +
            'The admin panel manages projects, skills, experience, security labs and messages, and produces the resume and cover letters as PDF from the same data.',
        },
        challenges: {
          fr:
            "Garder la 3D fluide sur un téléphone moyen : chargement différé et pause des scènes hors écran.\n\n" +
            "Héberger gratuitement sans perdre les images : stockage en base, car l'hébergeur efface son disque à chaque redémarrage.\n\n" +
            "Faire fonctionner la connexion sur Safari avec un site et une API sur deux domaines : les appels passent par un relais sur le domaine du site.",
          en:
            'Keeping 3D smooth on an average phone: deferred loading and pausing off-screen scenes.\n\n' +
            'Free hosting without losing images: files stored in the database, because the host wipes its disk on every restart.\n\n' +
            'Making login work on Safari with the site and API on two domains: calls go through a proxy on the site domain.',
        },
        features: {
          fr: ['Scènes 3D interactives', 'Administration complète', 'CV et lettres générés en PDF', 'Sécurité : JWT rotatif, RBAC, audit', 'Hébergement gratuit Vercel, Render, TiDB'],
          en: ['Interactive 3D scenes', 'Full admin panel', 'Resume and cover letters generated as PDF', 'Security: rotating JWT, RBAC, audit', 'Free hosting on Vercel, Render, TiDB'],
        },
      },
    });
    await linkSkills(portfolio.id, ['Next.js', 'React.js', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Express.js', 'Prisma', 'MySQL']);
    log('projet « Admin Console » -> « Portfolio full-stack et back-office », vrai lien du site');
  }

  /* UniPay : projet de fin d'études du master, sans les faux liens d'exemple. */
  const unipay =
    (await prisma.project.findUnique({ where: { slug: 'unipay-platform' } })) ??
    (await prisma.project.findUnique({ where: { slug: 'unipay' } }));
  if (unipay) {
    await prisma.project.update({
      where: { id: unipay.id },
      data: {
        slug: 'unipay',
        title: 'UniPay',
        githubUrl: null,
        demoUrl: null,
        order: 2,
        description: {
          fr: "Plateforme de transfert d'argent à l'international, de paiement en ligne et d'épargne, avec assistant conversationnel intégré. Mon projet de fin d'études de master.",
          en: "International money transfer, online payment and savings platform with a built-in conversational assistant. My master's final project.",
        },
        content: {
          fr: "Projet de fin d'études de mon master en systèmes d'information et sécurité des communications (SISC), à l'Institut Universitaire des Bâtisseurs (IUB). Conçu de bout en bout : interface, API et base de données.",
          en: "Final project of my master's degree in Information Systems and Communications Security (SISC) at the Institut Universitaire des Bâtisseurs (IUB). Built end to end: interface, API and database.",
        },
        features: {
          fr: ["Transfert d'argent international", 'Paiement en ligne', 'Épargne', 'Assistant conversationnel', 'Tableau de bord'],
          en: ['International money transfer', 'Online payment', 'Savings', 'Conversational assistant', 'Dashboard'],
        },
      },
    });
    log('projet UniPay : faux liens retirés, présenté comme projet de master');
  }

  /* Le master mentionne son projet de fin d'études : le CV imprime cette description. */
  const master = await prisma.education.findFirst({ where: { school: { contains: 'Bâtisseurs' } } });
  if (master) {
    await prisma.education.update({
      where: { id: master.id },
      data: {
        degree: {
          fr: "Master en systèmes d'information et sécurité des communications (SISC)",
          en: "Master's degree in Information Systems and Communications Security (SISC)",
        },
        description: {
          fr: "Projet de fin d'études : UniPay, plateforme de transfert d'argent, de paiement en ligne et d'épargne.",
          en: 'Final project: UniPay, a money transfer, online payment and savings platform.',
        },
      },
    });
    log('master : intitulé SISC corrigé, projet de fin d\'études UniPay mentionné');
  }

  const guidtique = await prisma.project.findUnique({ where: { slug: 'guidtique' } });
  if (guidtique) {
    await prisma.project.update({
      where: { id: guidtique.id },
      data: {
        order: 1,
        date: new Date('2025-11-21'),
        description: {
          fr: 'Plateforme qui met en relation les touristes et les guides locaux. Projet de fin de stage réalisé chez eScrutin.',
          en: 'Platform that connects tourists with local guides. End-of-internship project built at eScrutin.',
        },
      },
    });
    log('projet GuidTique : faute corrigée, version anglaise ajoutée');
  }
}

async function fixExperiences() {
  const escrutin = await prisma.experience.findFirst({ where: { company: 'eScrutin' } });
  if (escrutin) {
    await prisma.experience.update({
      where: { id: escrutin.id },
      data: {
        role: { fr: 'Stagiaire développeur full-stack', en: 'Full-stack developer intern' },
        description: {
          fr: 'Stage de 4 mois : conception et développement de GuidTique, projet de fin de stage.',
          en: '4-month internship: design and development of GuidTique, my end-of-internship project.',
        },
        achievements: {
          fr: ['Conçu et développé GuidTique, plateforme de mise en relation entre touristes et guides locaux (React, Chakra UI, Node.js, Express, Prisma, MySQL)'],
          en: ['Designed and built GuidTique, a platform connecting tourists with local guides (React, Chakra UI, Node.js, Express, Prisma, MySQL)'],
        },
        ...(DATES.escrutin.start && DATES.escrutin.end
          ? { startDate: new Date(DATES.escrutin.start), endDate: new Date(DATES.escrutin.end), isCurrent: false }
          : {}),
      },
    });
    log(`eScrutin : poste « Stagiaire »${DATES.escrutin.start ? ', dates corrigées' : ' (dates en attente)'}`);
  }

  const upsert = async (
    company: string,
    data: Omit<Parameters<typeof prisma.experience.create>[0]['data'], 'company'>
  ) => {
    const existing = await prisma.experience.findFirst({ where: { company } });
    if (existing) await prisma.experience.update({ where: { id: existing.id }, data });
    else await prisma.experience.create({ data: { company, ...data } });
  };

  if (DATES.afrikedge.start) {
    await upsert('Afrikedge', {
      location: 'Télétravail depuis le Cameroun (entreprise à Maurice)',
      role: { fr: 'Développeur full-stack Vue 3 / NestJS (télétravail)', en: 'Vue 3 / NestJS full-stack developer (remote)' },
      description: {
        fr: "Développement et livraison de projets web pour une entreprise basée à l'île Maurice, entièrement à distance.",
        en: 'Building and delivering web projects for a Mauritius-based company, fully remote.',
      },
      achievements: {
        fr: [
          "Conception et livraison de projets web de bout en bout en Vue 3 et NestJS pour une entreprise basée à l'île Maurice",
          'Travail 100 % à distance : organisation autonome, livraisons régulières, communication asynchrone',
        ],
        en: [
          'Designed and delivered end-to-end web projects with Vue 3 and NestJS for a Mauritius-based company',
          'Fully remote: self-organised work, regular deliveries, asynchronous communication',
        ],
      },
      startDate: new Date(DATES.afrikedge.start),
      endDate: null,
      isCurrent: true,
      order: 0,
    });
    log('Afrikedge : expérience actuelle ajoutée');
  } else log('Afrikedge : en attente de la date de début');

  if (DATES.irex.start && DATES.irex.end) {
    await upsert("IREX (Institut de Retour d'Expérience)", {
      location: 'En ligne',
      role: { fr: 'Stagiaire, initiation au télétravail', en: 'Intern, introduction to remote work' },
      description: {
        fr: 'Stage en ligne consacré aux méthodes et aux outils du travail à distance.',
        en: 'Online internship focused on remote work methods and tools.',
      },
      achievements: {
        fr: ['Formation aux méthodes et outils du travail à distance : organisation, collaboration et communication en ligne'],
        en: ['Training in remote work methods and tools: organisation, online collaboration and communication'],
      },
      startDate: new Date(DATES.irex.start),
      endDate: new Date(DATES.irex.end),
      isCurrent: false,
      order: 2,
    });
    log('IREX : stage ajouté');
  } else log('IREX : en attente des dates');
}

async function fixCoverLetters() {
  const replacements: Array<[RegExp, string]> = [
    [
      /Titulaire d'un (Master 2 en génie informatique, spécialité sécurité des systèmes d'information et des communications|master professionnel en sécurité informatique et réseaux),/,
      "Titulaire d'un master en systèmes d'information et sécurité des communications (SISC),",
    ],
    [
      /I hold a (Master's degree in Computer Engineering, majoring in information systems and communications security|professional Master's degree in Information Security and Networks), and/,
      "I hold a Master's degree in Information Systems and Communications Security (SISC), and",
    ],
    [/sont disponibles à l'adresse indiquée ci-dessus\./, `sont disponibles sur ${SITE.replace('https://', '')}.`],
    [/are available at the address above\./, `are available at ${SITE.replace('https://', '')}.`],
  ];

  let changed = 0;
  for (const letter of await prisma.coverLetter.findMany()) {
    const body = (letter.body as string[]).map((p) => replacements.reduce((text, [from, to]) => text.replace(from, to), p));
    if (JSON.stringify(body) !== JSON.stringify(letter.body)) {
      await prisma.coverLetter.update({ where: { id: letter.id }, data: { body } });
      changed += 1;
    }
  }
  log(`lettres de motivation : ${changed} corrigée(s) (diplôme, adresse du portfolio)`);
}

/* ------------------------------------------------------------------ */

const main = async () => {
  console.log(`[contenu] Base : ${url!.replace(/^.*@([^:/]+).*$/, '$1')}`);
  await fixProfile();
  await fixConfig();
  await fixProjects();
  await fixExperiences();
  await fixCoverLetters();
  console.log('[contenu] Terminé. Le site public se met à jour en une minute environ.');
};

main()
  .catch((error) => {
    console.error('[contenu] Échec :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
