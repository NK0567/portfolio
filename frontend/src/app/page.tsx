import React from 'react';
import { getPublic, API_ORIGIN } from '@/lib/server-api';
import { list, text, yearsSince } from '@/lib/content';
import { resolveSectionOrder, type HomeSection } from '@/lib/sections';
import PublicShell from '@/components/public/public-shell';
import Hero from '@/components/public/hero';
import Section from '@/components/public/section';
import StackSection from '@/components/public/sections/stack-section';
import ProjectsShowcase from '@/components/public/sections/projects-showcase';
import CodeSection from '@/components/public/sections/code-section';
import SkillNetwork from '@/components/public/sections/skill-network';
import PipelineSection from '@/components/public/sections/pipeline-section';
import SecuritySection from '@/components/public/sections/security-section';
import TimelineSection from '@/components/public/timeline-section';
import ContactSection from '@/components/public/sections/contact-section';
import { cvService } from '@/services/cv.service';
import type { CyberLab, Education, Experience, GlobalConfig, Profile, Project, Skill } from '@/types/api';

/**
 * Page d'accueil, rendue sur le serveur.
 *
 * Toutes les données sont lues ici, avant l'envoi du HTML : Google,
 * LinkedIn et WhatsApp reçoivent une page complète. Les requêtes partent en
 * parallèle et chacune peut échouer seule, auquel cas sa section se tait.
 *
 * L'ordre des sections vient de l'écran Site de l'administration.
 */
export const revalidate = 60;

const clean = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export default async function HomePage() {
  const [profile, config, projects, skills, experiences, education, labs] = await Promise.all([
    getPublic<Profile>('/profile'),
    getPublic<GlobalConfig>('/config'),
    getPublic<Project[]>('/projects'),
    getPublic<Skill[]>('/skills'),
    getPublic<Experience[]>('/experiences'),
    getPublic<Education[]>('/education'),
    getPublic<CyberLab[]>('/labs'),
  ]);

  const allProjects = projects ?? [];
  const allSkills = skills ?? [];
  const allExperiences = experiences ?? [];
  const allEducation = education ?? [];
  const allLabs = labs ?? [];

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : 'Portfolio';
  const headline = text(profile?.headline) || list(profile?.titles)[0] || 'Développeur full stack';
  const social = config?.socialLinks ?? {};
  const email = clean(profile?.email) ?? clean(social.email);

  const skillsIn = (...categories: Skill['category'][]) =>
    allSkills.filter((s) => categories.includes(s.category)).map((s) => s.name);

  const apiDown = !profile && !config && allProjects.length === 0;

  const sections: Record<HomeSection, React.ReactNode> = {
    stack: <StackSection skills={allSkills} />,
    projects: <ProjectsShowcase projects={allProjects} assetBase={API_ORIGIN} />,
    code: (
      <CodeSection
        fullName={fullName}
        headline={headline}
        email={email}
        available={config?.isAvailable ?? false}
        skills={[...allSkills].sort((a, b) => b.level - a.level).map((s) => s.name)}
        projects={allProjects.map((p) => ({ title: p.title, slug: p.slug }))}
        cvUrl={cvService.downloadUrl('fr')}
      />
    ),
    skills: <SkillNetwork skills={allSkills} />,
    devops: <PipelineSection tools={skillsIn('DEVOPS', 'CLOUD')} />,
    security: <SecuritySection skills={skillsIn('CYBERSECURITY')} labs={allLabs} />,
    experience: (
      <Section
        id="parcours"
        eyebrow="Parcours"
        title="Expériences et formation"
        intro="Le chemin parcouru, du plus récent au plus ancien."
      >
        <TimelineSection experiences={allExperiences} education={allEducation} />
      </Section>
    ),
    contact: (
      <ContactSection
        email={email}
        phone={clean(profile?.phone)}
        github={clean(social.github)}
        linkedin={clean(social.linkedin)}
        whatsapp={clean(social.whatsapp)}
      />
    ),
  };

  return (
    <PublicShell name={fullName} config={config}>
      <main>
        <Hero
          fullName={fullName}
          headline={headline}
          titles={list(profile?.titles)}
          bio={text(profile?.bio)}
          location={clean(profile?.location)}
          available={config?.isAvailable ?? false}
          availability={clean(config?.freelanceStatus)}
          counts={{
            projects: allProjects.length,
            skills: allSkills.length,
            years: yearsSince(allExperiences.map((e) => e.startDate)),
            labs: allLabs.length,
          }}
        />

        {apiDown && (
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <p className="glass p-4 text-sm text-haze">
              Le contenu n&apos;a pas pu être chargé. Le site reste en ligne, les données reviendront dès que
              l&apos;API répondra.
            </p>
          </div>
        )}

        {resolveSectionOrder(config?.sectionOrder).map((key) => (
          <React.Fragment key={key}>{sections[key]}</React.Fragment>
        ))}
      </main>
    </PublicShell>
  );
}
