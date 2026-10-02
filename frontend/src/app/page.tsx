import { getPublic, API_ORIGIN } from '@/lib/server-api';
import SiteHeader from '@/components/public/site-header';
import SiteFooter from '@/components/public/site-footer';
import Hero from '@/components/public/hero';
import Section from '@/components/public/section';
import ProjectsSection from '@/components/public/projects-section';
import LabsSection from '@/components/public/labs-section';
import SkillsSection from '@/components/public/skills-section';
import TimelineSection from '@/components/public/timeline-section';
import ContactForm from '@/components/public/contact-form';
import type { CyberLab, Education, Experience, GlobalConfig, Profile, Project, Skill } from '@/types/api';

/**
 * Page d'accueil, rendue sur le serveur.
 *
 * Toutes les données sont lues ici, avant l'envoi du HTML. Google, LinkedIn
 * et WhatsApp reçoivent donc une page complète, ce qui n'était pas le cas
 * avec le chargement dans un useEffect.
 *
 * Les sept requêtes partent en parallèle : le temps d'affichage est celui de
 * la plus lente, pas leur somme. Et chacune peut échouer seule, auquel cas sa
 * section se contente de dire qu'elle est vide.
 */
export const revalidate = 60;

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

  /*
   * Années d'expérience déduites de la plus ancienne expérience saisie,
   * plutôt qu'écrites en dur. Le chiffre augmente tout seul avec le temps et
   * ne devient jamais faux.
   */
  const years = (() => {
    const starts = allExperiences
      .map((e) => new Date(e.startDate).getTime())
      .filter((t) => !Number.isNaN(t));

    if (starts.length === 0) return 0;
    const oldest = Math.min(...starts);
    return Math.max(0, Math.floor((Date.now() - oldest) / (365.25 * 24 * 3600 * 1000)));
  })();

  const apiDown = !profile && !config && allProjects.length === 0;

  return (
    <>
      <SiteHeader name={fullName} showLabs={allLabs.length > 0} />

      <main>
        <Hero
          profile={profile}
          config={config}
          counts={{ projects: allProjects.length, skills: allSkills.length, years }}
        />

        {apiDown && (
          <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
            <p className="rounded-sm border border-rule p-4 text-sm text-haze">
              Le contenu n&apos;a pas pu être chargé. Le site reste en ligne, les données
              reviendront dès que l&apos;API répondra.
            </p>
          </div>
        )}

        <Section
          id="projets"
          title="Projets"
          intro="Chaque fiche détaille l'architecture retenue, les difficultés rencontrées et ce qui en est sorti."
        >
          <ProjectsSection projects={allProjects} assetBase={API_ORIGIN} />
        </Section>

        {/*
         * Juste après les projets et non en bas de page : c'est le contenu
         * qu'un visiteur ne trouvera nulle part ailleurs. Et absente tant que
         * rien n'est publié, une section vide desservant plus qu'une absente.
         */}
        {allLabs.length > 0 && (
          <Section
            id="labs"
            title="Labs de sécurité"
            intro="Machines et challenges résolus, avec la démarche complète et la correction recommandée pour chaque faille."
          >
            <LabsSection labs={allLabs} />
          </Section>
        )}

        <Section
          id="competences"
          title="Compétences"
          intro="Les technologies que j'utilise réellement en production, avec le nombre d'années de pratique."
        >
          <SkillsSection skills={allSkills} />
        </Section>

        <Section id="parcours" title="Parcours" intro="Expériences et formation, dans l'ordre.">
          <TimelineSection experiences={allExperiences} education={allEducation} />
        </Section>

        <Section
          id="contact"
          title="Me contacter"
          intro="Une proposition de poste, une mission, une question technique : écris-moi."
        >
          <ContactForm email={profile?.email ?? null} phone={profile?.phone ?? null} />
        </Section>
      </main>

      <SiteFooter name={fullName} config={config} />
    </>
  );
}
