import type { MetadataRoute } from 'next';
import { getPublic } from '@/lib/server-api';
import type { CyberLab, Project } from '@/types/api';

/**
 * Plan du site, construit depuis la base.
 *
 * L'ancienne version listait trois adresses écrites en dur, dont /portfolio
 * qui n'existe pas et /login qu'on ne veut surtout pas voir indexée. Chaque
 * projet publié y figure désormais avec sa vraie date de mise à jour, ce qui
 * est exactement ce que Google attend pour revenir lire une page modifiée.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://boris-ngouadjeu.com';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, labs] = await Promise.all([
    getPublic<Project[]>('/projects', { revalidate: 3600 }).then((r) => r ?? []),
    // Sans jeton, la route ne renvoie que les labs publiés : aucun brouillon ne fuit ici.
    getPublic<CyberLab[]>('/labs', { revalidate: 3600 }).then((r) => r ?? []),
  ]);

  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${SITE_URL}/projects/${project.slug}`,
    lastModified: new Date(project.updatedAt ?? project.createdAt ?? Date.now()),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const labEntries: MetadataRoute.Sitemap = labs.map((lab) => ({
    url: `${SITE_URL}/labs/${lab.slug}`,
    lastModified: new Date(lab.updatedAt ?? lab.createdAt ?? Date.now()),
    changeFrequency: 'yearly',
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...projectEntries,
    ...labEntries,
  ];
}
