import { api } from '@/lib/api';
import type { ApiResponse, Skill, SkillCategory } from '@/types/api';

export interface SkillFormInput {
  name: string;
  category: SkillCategory;
  level: number;
  yearsOfExp: number;
  logo?: File | null;
  logoUrl?: string;
  order?: number;
}

const toFormData = (input: SkillFormInput): FormData => {
  const fd = new FormData();
  fd.append('name', input.name);
  fd.append('category', input.category);
  fd.append('level', String(input.level));
  fd.append('yearsOfExp', String(input.yearsOfExp));
  if (input.order !== undefined) fd.append('order', String(input.order));
  // Champ fichier `logo` : voir uploadImage.single('logo') côté route.
  if (input.logo) fd.append('logo', input.logo);
  else if (input.logoUrl) fd.append('logoUrl', input.logoUrl);
  return fd;
};

export const skillService = {
  /** Liste à plat, triée par catégorie puis par ordre. */
  async getAll(): Promise<Skill[]> {
    const { data } = await api.get<ApiResponse<Skill[]>>('/skills');
    return data.data ?? [];
  },

  /** Liste déjà regroupée par catégorie, pratique pour la page publique. */
  async getGrouped(): Promise<Record<string, Skill[]>> {
    const { data } = await api.get<ApiResponse<Record<string, Skill[]>>>('/skills', {
      params: { grouped: 'true' },
    });
    return data.data ?? {};
  },

  async create(input: SkillFormInput): Promise<Skill> {
    const payload = input.logo
      ? toFormData(input)
      : {
          name: input.name,
          category: input.category,
          level: input.level,
          yearsOfExp: input.yearsOfExp,
          ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
          ...(input.order !== undefined ? { order: input.order } : {}),
        };

    const { data } = await api.post<ApiResponse<Skill>>('/skills', payload);
    return data.data;
  },

  async update(id: string, input: Partial<SkillFormInput>): Promise<Skill> {
    const { data } = await api.put<ApiResponse<Skill>>(`/skills/${id}`, input);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/skills/${id}`);
  },
};
