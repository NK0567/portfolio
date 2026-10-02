import { SKILL_CATEGORY_LABELS, type Skill, type SkillCategory } from '@/types/api';

interface Props {
  skills: Skill[];
}

/**
 * Compétences.
 *
 * Pas de barres de progression, pas de pourcentages affichés. « React 85 % »
 * ne veut rien dire : 85 % de quoi, mesuré comment, par qui. Un recruteur
 * technique le sait et ça le fait sourire. Ce qui se vérifie, c'est le nombre
 * d'années et le nombre de projets où la technologie a réellement servi.
 *
 * Le champ `level` reste en base et sert à l'ordre d'affichage, mais il n'est
 * pas montré.
 */

const ORDER: SkillCategory[] = [
  'FRONTEND',
  'MOBILE',
  'BACKEND',
  'DATABASE',
  'CYBERSECURITY',
  'DEVOPS',
  'CLOUD',
  'OTHER',
];

export default function SkillsSection({ skills }: Props) {
  if (skills.length === 0) {
    return <p className="text-haze">Aucune compétence publiée pour le moment.</p>;
  }

  const grouped = new Map<SkillCategory, Skill[]>();
  for (const skill of skills) {
    grouped.set(skill.category, [...(grouped.get(skill.category) ?? []), skill]);
  }

  const categories = ORDER.filter((category) => grouped.has(category));

  return (
    <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const items = (grouped.get(category) ?? []).sort(
          (a, b) => a.order - b.order || b.level - a.level
        );

        return (
          <div key={category}>
            <h3 className="border-b border-rule pb-2 font-semibold text-ink">
              {SKILL_CATEGORY_LABELS[category]}
            </h3>

            <ul className="mt-3 space-y-2">
              {items.map((skill) => (
                <li key={skill.id} className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-sm text-graphite">{skill.name}</span>
                  {skill.yearsOfExp > 0 && (
                    <span className="shrink-0 text-xs text-haze">
                      {skill.yearsOfExp} {skill.yearsOfExp > 1 ? 'ans' : 'an'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
