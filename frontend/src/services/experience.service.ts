import { api } from '@/lib/api';
import type { ApiResponse, Experience, I18nText, I18nList } from '@/types/api';

export interface ExperienceFormInput {
  company: string;
  location: string;
  /** Chemin du logo de l'entreprise, null pour le retirer. */
  logoUrl?: string | null;
  role: I18nText;
  description: I18nText;
  achievements?: I18nList;
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
  order?: number;
}

export const experienceService = {
  async getAll(): Promise<Experience[]> {
    const { data } = await api.get<ApiResponse<Experience[]>>('/experiences');
    return data.data ?? [];
  },
  async create(input: ExperienceFormInput): Promise<Experience> {
    const { data } = await api.post<ApiResponse<Experience>>('/experiences', input);
    return data.data;
  },
  async update(id: string, input: Partial<ExperienceFormInput>): Promise<Experience> {
    const { data } = await api.put<ApiResponse<Experience>>(`/experiences/${id}`, input);
    return data.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/experiences/${id}`);
  },
};
