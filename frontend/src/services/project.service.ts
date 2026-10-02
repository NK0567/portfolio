import { api } from '@/lib/api';
import type { ApiResponse, I18nList, I18nText, Project, ProjectStatus } from '@/types/api';

/**
 * Données du formulaire de création et de modification d'un projet.
 *
 * Cette interface couvre désormais TOUS les champs acceptés par
 * src/schemas/project.schema.ts côté serveur. La version précédente en
 * déclarait neuf sur quinze : `features`, `challenges`, `images`,
 * `documentation` et `architecture` étaient absents, donc impossibles à
 * saisir, donc vides en base, donc invisibles sur la page publique du
 * projet. Le serveur les acceptait pourtant depuis le début.
 *
 * Les noms correspondent exactement au schéma Zod. Les anciens
 * `technologies`, `imageUrl` et `liveUrl` n'existent pas côté serveur, c'est
 * ce décalage qui provoquait un 400 à l'enregistrement.
 */
export interface ProjectFormInput {
  title: string;
  description: I18nText;
  content?: I18nText;

  /** URL absolue OU chemin /uploads/... Ignoré si `coverImage` est fourni. */
  mainImage?: string;
  /** Fichier envoyé en multipart ; le backend en déduit `mainImage`. */
  coverImage?: File | null;
  /** Galerie : chemins déjà déposés via POST /api/uploads/image. */
  images?: string[];

  githubUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  documentation?: string;

  status?: ProjectStatus;
  /** Couples libres, par exemple { "Frontend": "Next.js 16", "Base": "MySQL" }. */
  architecture?: Record<string, string>;
  features?: I18nList;
  challenges?: I18nText;

  /** Identifiants UUID de compétences EXISTANTES, pas des noms libres. */
  skillIds?: string[];
  /** Obligatoire à la création. */
  date?: string;
  order?: number;
}

/**
 * Construit le FormData attendu quand un fichier de couverture est joint.
 *
 * En multipart, tout circule en chaîne de caractères : chaque objet et chaque
 * tableau doit être sérialisé. Le helper `jsonField` du backend les reparse
 * avant validation. Oublier un JSON.stringify ici produit un 422 sur un champ
 * qui semblait pourtant rempli.
 */
const toFormData = (input: ProjectFormInput): FormData => {
  const fd = new FormData();

  fd.append('title', input.title);
  fd.append('description', JSON.stringify(input.description));

  if (input.content) fd.append('content', JSON.stringify(input.content));
  if (input.features) fd.append('features', JSON.stringify(input.features));
  if (input.challenges) fd.append('challenges', JSON.stringify(input.challenges));
  if (input.architecture) fd.append('architecture', JSON.stringify(input.architecture));
  if (input.images) fd.append('images', JSON.stringify(input.images));
  if (input.skillIds) fd.append('skillIds', JSON.stringify(input.skillIds));

  // Le nom du champ fichier DOIT être `coverImage` : c'est celui déclaré dans
  // uploadImage.single('coverImage') côté route.
  if (input.coverImage) fd.append('coverImage', input.coverImage);
  else if (input.mainImage) fd.append('mainImage', input.mainImage);

  if (input.githubUrl) fd.append('githubUrl', input.githubUrl);
  if (input.demoUrl) fd.append('demoUrl', input.demoUrl);
  if (input.videoUrl) fd.append('videoUrl', input.videoUrl);
  if (input.documentation) fd.append('documentation', input.documentation);
  if (input.status) fd.append('status', input.status);
  if (input.date) fd.append('date', input.date);
  if (input.order !== undefined) fd.append('order', String(input.order));

  return fd;
};

/** Corps JSON, utilisé quand aucun fichier n'est joint. */
const toJson = (input: ProjectFormInput): Record<string, unknown> => ({
  title: input.title,
  description: input.description,
  ...(input.content ? { content: input.content } : {}),
  ...(input.features ? { features: input.features } : {}),
  ...(input.challenges ? { challenges: input.challenges } : {}),
  ...(input.architecture ? { architecture: input.architecture } : {}),
  ...(input.images ? { images: input.images } : {}),
  ...(input.mainImage ? { mainImage: input.mainImage } : {}),
  ...(input.githubUrl ? { githubUrl: input.githubUrl } : {}),
  ...(input.demoUrl ? { demoUrl: input.demoUrl } : {}),
  ...(input.videoUrl ? { videoUrl: input.videoUrl } : {}),
  ...(input.documentation ? { documentation: input.documentation } : {}),
  ...(input.status ? { status: input.status } : {}),
  ...(input.date ? { date: input.date } : {}),
  ...(input.order !== undefined ? { order: input.order } : {}),
  ...(input.skillIds ? { skillIds: input.skillIds } : {}),
});

export const projectService = {
  /** Liste publique, éventuellement filtrée. */
  async getAll(filters?: {
    status?: ProjectStatus;
    skill?: string;
    search?: string;
  }): Promise<Project[]> {
    const { data } = await api.get<ApiResponse<Project[]>>('/projects', { params: filters });
    return data.data ?? [];
  },

  /** Détail public par slug. */
  async getBySlug(slug: string): Promise<Project> {
    const { data } = await api.get<ApiResponse<Project>>(`/projects/${slug}`);
    return data.data;
  },

  /**
   * Création (admin). Bascule automatiquement en multipart si un fichier est joint.
   *
   * On ne fixe volontairement PAS l'en-tête Content-Type : axios doit générer
   * lui-même la « boundary » du multipart. La forcer à la main produit un
   * corps que le serveur ne sait pas découper, et donc un 400.
   */
  async create(input: ProjectFormInput): Promise<Project> {
    const payload = input.coverImage ? toFormData(input) : toJson(input);
    const { data } = await api.post<ApiResponse<Project>>('/projects', payload);
    return data.data;
  },

  /** Modification (admin) : n'envoie que les champs réellement fournis. */
  async update(id: string, input: ProjectFormInput): Promise<Project> {
    const payload = input.coverImage ? toFormData(input) : toJson(input);
    const { data } = await api.put<ApiResponse<Project>>(`/projects/${id}`, payload);
    return data.data;
  },

  /** Suppression (admin). */
  async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};
