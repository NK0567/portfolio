import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Seed idempotent : peut être relancé sans créer de doublons.
 *
 * Il ne s'exécute QUE sur commande explicite (`npm run db:seed`), jamais au
 * démarrage du serveur. Un serveur qui écrit des données de démonstration
 * tout seul est un accident de production qui attend son heure — c'est
 * pourquoi l'ancien src/utils/bootstrap.ts a été supprimé.
 */
async function main(): Promise<void> {
  /* ---------------- 1. Compte administrateur ---------------- */
  const email = process.env.SEED_ADMIN_EMAIL;
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !username || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL, SEED_ADMIN_USERNAME et SEED_ADMIN_PASSWORD doivent être définis dans .env.\n' +
        'Aucun identifiant ne doit être écrit en dur dans ce fichier : il est versionné dans Git.'
    );
  }

  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD doit faire au moins 12 caractères.');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log(`[seed] Administrateur déjà présent : ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, username, passwordHash, role: 'SUPERADMIN' },
    });
    console.log(`[seed] Administrateur créé : ${email}`);
  }

  /* ---------------- 2. Profil (singleton) ----------------
   * Ces données alimentent à la fois le portfolio public ET le CV généré.
   * Modifie-les depuis /admin/settings, jamais ici : ce fichier n'est rejoué
   * que sur une base vierge.
   */
  const existingProfile = await prisma.profile.findFirst();

  if (!existingProfile) {
    await prisma.profile.create({
      data: {
        firstName: 'Boris',
        lastName: 'Kalefack Ngouadjeu',
        email: 'boriskalefack@gmail.com',
        phone: '+237 689 46 78 77',
        phoneAlt: '+237 673 78 09 46',
        location: 'Dschang, Cameroun',
        birthDate: new Date('1999-06-05'),
        headline: {
          fr: 'Développeur Full-Stack Web & Mobile',
          en: 'Full-Stack Web & Mobile Developer',
        },
        bio: {
          fr: "Développeur full-stack web et mobile (React.js, Vue.js, Node.js / NestJS, Flutter). Quatre applications conçues et développées de la base de données à l'interface, dont UniPay, plateforme de transfert d'argent et de paiement en ligne réalisée chez eScrutin. Titulaire d'un master en systèmes d'information et sécurité des communications (SISC), j'aborde l'authentification, la protection des données et le déploiement comme des contraintes de conception, et non comme des correctifs de fin de projet. Je recherche un poste de développeur full-stack sur des produits en production.",
          en: "Full-stack web and mobile developer (React.js, Vue.js, Node.js / NestJS, Flutter). Four applications designed and built from database to interface, including UniPay, a money transfer and online payment platform built at eScrutin. With a master's degree in Information Systems and Communications Security (SISC), I treat authentication, data protection and deployment as design constraints rather than end-of-project fixes.",
        },
        titles: {
          fr: ['Développeur Full-Stack', 'Ingénieur logiciel', 'Sécurité des SI & des communications'],
          en: ['Full-Stack Developer', 'Software Engineer', 'Information Systems & Communications Security'],
        },
        languages: [
          { name: 'Français', level: 'courant' },
          { name: 'Anglais', level: 'scolaire' },
        ],
        interests: {
          fr: ['Veille technologique', 'Sciences'],
          en: ['Technology watch', 'Science'],
        },
      },
    });
    console.log('[seed] Profil créé.');
  } else {
    console.log('[seed] Profil déjà présent.');
  }

  /* ---------------- 3. Configuration globale (singleton) ---------------- */
  await prisma.globalConfig.upsert({
    where: { id: 'current_config' },
    update: {},
    create: {
      id: 'current_config',
      siteName: 'Portfolio',
      isAvailable: true,
      freelanceStatus: 'Disponible',
      themeConfig: {
        primaryColor: '#22d3ee',
        accentColor: '#3b82f6',
        defaultMode: 'system',
        fontHeading: 'Inter',
        fontBody: 'Inter',
      },
      seoConfig: {
        title: { fr: 'Portfolio | Développeur Full Stack', en: 'Portfolio | Full Stack Developer' },
        description: {
          fr: 'Portfolio professionnel : projets, compétences et expériences.',
          en: 'Professional portfolio: projects, skills and experience.',
        },
        keywords: ['développeur', 'full stack', 'portfolio', 'react', 'node'],
        ogImage: '',
      },
      socialLinks: { github: '', linkedin: '', email: '' },
      languages: ['fr', 'en'],
      sectionOrder: ['stack', 'projects', 'code', 'skills', 'devops', 'security', 'experience', 'contact'],
    },
  });
  console.log('[seed] Configuration globale prête.');

  /* ---------------- 4. Compétences de démonstration ---------------- */
  const skillSeeds = [
    // Frontend
    { name: 'JavaScript', category: 'FRONTEND' as const, level: 90, yearsOfExp: 4, order: 1 },
    { name: 'TypeScript', category: 'FRONTEND' as const, level: 85, yearsOfExp: 3, order: 2 },
    { name: 'React.js', category: 'FRONTEND' as const, level: 90, yearsOfExp: 4, order: 3 },
    { name: 'Vue.js', category: 'FRONTEND' as const, level: 70, yearsOfExp: 2, order: 4 },
    { name: 'Next.js', category: 'FRONTEND' as const, level: 80, yearsOfExp: 2, order: 5 },
    { name: 'Tailwind CSS', category: 'FRONTEND' as const, level: 85, yearsOfExp: 2, order: 6 },
    { name: 'Chakra UI', category: 'FRONTEND' as const, level: 80, yearsOfExp: 3, order: 7 },
    { name: 'Bootstrap', category: 'FRONTEND' as const, level: 75, yearsOfExp: 4, order: 8 },
    // Mobile
    { name: 'Flutter', category: 'MOBILE' as const, level: 80, yearsOfExp: 2, order: 1 },
    { name: 'Dart', category: 'MOBILE' as const, level: 80, yearsOfExp: 2, order: 2 },
    // Backend
    { name: 'Node.js', category: 'BACKEND' as const, level: 88, yearsOfExp: 4, order: 1 },
    { name: 'Express.js', category: 'BACKEND' as const, level: 88, yearsOfExp: 4, order: 2 },
    { name: 'NestJS', category: 'BACKEND' as const, level: 70, yearsOfExp: 1, order: 3 },
    { name: 'PHP', category: 'BACKEND' as const, level: 70, yearsOfExp: 3, order: 4 },
    { name: 'Java', category: 'BACKEND' as const, level: 65, yearsOfExp: 2, order: 5 },
    { name: 'Spring Boot', category: 'BACKEND' as const, level: 60, yearsOfExp: 1, order: 6 },
    { name: 'C++', category: 'BACKEND' as const, level: 60, yearsOfExp: 2, order: 7 },
    // Donnees
    { name: 'SQL', category: 'DATABASE' as const, level: 80, yearsOfExp: 4, order: 1 },
    { name: 'MySQL', category: 'DATABASE' as const, level: 80, yearsOfExp: 4, order: 2 },
    { name: 'Prisma', category: 'DATABASE' as const, level: 80, yearsOfExp: 2, order: 3 },
    // Outils
    { name: 'Git', category: 'DEVOPS' as const, level: 85, yearsOfExp: 4, order: 1 },
    { name: 'GitHub', category: 'DEVOPS' as const, level: 85, yearsOfExp: 4, order: 2 },
    { name: 'Linux', category: 'DEVOPS' as const, level: 75, yearsOfExp: 3, order: 3 },
    { name: 'WordPress', category: 'DEVOPS' as const, level: 70, yearsOfExp: 3, order: 4 },
    // Reseaux & securite
    { name: 'Administration LAN / Ethernet', category: 'CYBERSECURITY' as const, level: 75, yearsOfExp: 3, order: 1 },
    { name: "Sécurité des systèmes d'information", category: 'CYBERSECURITY' as const, level: 75, yearsOfExp: 2, order: 2 },
  ];

  // `skipDuplicates` rend l'opération rejouable sans erreur d'unicité sur `name`.
  await prisma.skill.createMany({
    data: skillSeeds.map((s) => ({
      ...s,
      description: { fr: '', en: '' },
    })),
    skipDuplicates: true,
  });
  console.log(`[seed] ${skillSeeds.length} compétences vérifiées.`);

  /* ---------------- 5. Projets de démonstration ---------------- */
  const projectCount = await prisma.project.count();

  if (projectCount === 0) {
    const [react, next, node, prismaSkill] = await Promise.all([
      prisma.skill.findUnique({ where: { name: 'React' } }),
      prisma.skill.findUnique({ where: { name: 'Next.js' } }),
      prisma.skill.findUnique({ where: { name: 'Node.js' } }),
      prisma.skill.findUnique({ where: { name: 'Prisma' } }),
    ]);

    await prisma.project.create({
      data: {
        title: 'Plateforme Portfolio',
        slug: 'plateforme-portfolio',
        description: {
          fr: "Portfolio administrable de bout en bout, sans jamais toucher au code.",
          en: 'Fully manageable portfolio platform, no code changes required.',
        },
        content: {
          fr: 'Application Next.js côté public et API Express + Prisma côté administration.',
          en: 'Next.js public front-end with an Express + Prisma admin API.',
        },
        mainImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
        images: [],
        githubUrl: 'https://github.com',
        status: 'DEVELOPMENT',
        architecture: {},
        features: {
          fr: ['Tableau de bord', 'Authentification JWT', 'Gestion de contenu'],
          en: ['Dashboard', 'JWT authentication', 'Content management'],
        },
        challenges: {
          fr: "Séparer proprement le contenu du code pour ne plus jamais redéployer pour un texte.",
          en: 'Cleanly separating content from code to avoid redeploying for a text change.',
        },
        order: 1,
        date: new Date(),
        skills: {
          create: [next, node, prismaSkill]
            .filter((s): s is NonNullable<typeof s> => Boolean(s))
            .map((s) => ({ skill: { connect: { id: s.id } } })),
        },
      },
    });

    await prisma.project.create({
      data: {
        title: 'Tableau de bord analytique',
        slug: 'tableau-de-bord-analytique',
        description: {
          fr: 'Interface de visualisation de données en temps réel.',
          en: 'Real-time data visualisation interface.',
        },
        content: { fr: '', en: '' },
        mainImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
        images: [],
        status: 'COMPLETED',
        architecture: {},
        features: { fr: ['Graphiques interactifs'], en: ['Interactive charts'] },
        challenges: { fr: '', en: '' },
        order: 2,
        date: new Date('2026-03-01'),
        skills: {
          create: [react]
            .filter((s): s is NonNullable<typeof s> => Boolean(s))
            .map((s) => ({ skill: { connect: { id: s.id } } })),
        },
      },
    });

    console.log('[seed] 2 projets de démonstration créés.');
  } else {
    console.log(`[seed] ${projectCount} projet(s) déjà présents, création ignorée.`);
  }

  /* ---------------- 6. Formation ---------------- */
  const educationCount = await prisma.education.count();

  if (educationCount === 0) {
    await prisma.education.createMany({
      data: [
        {
          degree: {
            fr: "Master en systèmes d'information et sécurité des communications (SISC)",
            en: "Master's degree in Information Systems and Communications Security (SISC)",
          },
          school: 'Institut Universitaire des Bâtisseurs (IUB)',
          location: 'Dschang',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2026-07-01'),
          description: { fr: '', en: '' },
          order: 1,
        },
        {
          degree: {
            fr: 'Licence en informatique fondamentale',
            en: "Bachelor's degree in Fundamental Computer Science",
          },
          school: 'Université de Dschang',
          location: 'Dschang',
          startDate: new Date('2019-09-01'),
          endDate: new Date('2023-07-01'),
          description: { fr: '', en: '' },
          order: 2,
        },
        {
          degree: {
            fr: 'Baccalauréat série C, mathématiques et sciences physiques',
            en: 'High school diploma, Mathematics and Physics',
          },
          school: 'Collège privé Le Djiône',
          location: 'Douala',
          startDate: new Date('2019-01-01'),
          endDate: new Date('2019-07-01'),
          description: { fr: '', en: '' },
          order: 3,
        },
      ],
      skipDuplicates: true,
    });
    console.log('[seed] 3 formations créées.');
  }

  /* ---------------- 7. Expériences professionnelles ---------------- */
  const experienceCount = await prisma.experience.count();

  if (experienceCount === 0) {
    await prisma.experience.createMany({
      data: [
        {
          company: 'eScrutin',
          location: 'Yaoundé',
          role: { fr: 'Développeur full-stack', en: 'Full-stack developer' },
          description: {
            fr: "Conception et développement de UniPay, plateforme de transfert d'argent et de paiement en ligne.",
            en: 'Design and development of UniPay, a money transfer and online payment platform.',
          },
          achievements: {
            fr: [
              "Conçu et développé UniPay, plateforme intelligente de transfert d'argent à l'international, de paiement en ligne et d'épargne, avec assistant conversationnel intégré.",
            ],
            en: [
              'Designed and built UniPay, an intelligent platform for international money transfer, online payment and savings, with an integrated conversational assistant.',
            ],
          },
          startDate: new Date('2025-01-01'),
          endDate: new Date('2026-06-01'),
          isCurrent: false,
          order: 1,
        },
        {
          company: 'Centre Multifonctionnel de Promotion pour la Jeunesse (CMPJ)',
          location: 'Batcham',
          role: {
            fr: 'Enseignant de mathématiques et informatique',
            en: 'Mathematics and computer science teacher',
          },
          description: {
            fr: "Cours de bureautique et d'initiation à l'informatique.",
            en: 'Office software and introductory computing courses.',
          },
          achievements: {
            fr: [
              "Dispensé des cours de bureautique et d'initiation à l'informatique à 50 apprenants sur deux années.",
            ],
            en: [
              'Taught office software and introductory computing to 50 learners over two years.',
            ],
          },
          startDate: new Date('2023-09-01'),
          endDate: new Date('2025-06-01'),
          isCurrent: false,
          order: 2,
        },
      ],
      skipDuplicates: true,
    });
    console.log('[seed] 2 expériences créées.');
  }

  console.log('\n[seed] Terminé.\n');
}

main()
  .catch((error) => {
    console.error('[seed] Échec :', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
