import { api } from '@/lib/api';
import type { ApiResponse, CyberLab, I18nText, LabDifficulty, LabPlatform } from '@/types/api';

export interface LabFormInput {
  title: string;
  platform: LabPlatform;
  difficulty: LabDifficulty;
  category?: string;
  badgeUrl?: string;
  writeUpUrl?: string;
  summary: I18nText;
  content: I18nText;
  remediation: I18nText;
  techniques: string[];
  tools: string[];
  isPublished: boolean;
  order?: number;
  completedAt: string;
}

/**
 * Labs de sécurité.
 *
 * getAll passe par la même route que le site public : connecté, le jeton
 * accompagne la requête et le serveur renvoie aussi les brouillons.
 */
export const labService = {
  async getAll(): Promise<CyberLab[]> {
    const { data } = await api.get<ApiResponse<CyberLab[]>>('/labs');
    return data.data ?? [];
  },
  async getBySlug(slug: string): Promise<CyberLab> {
    const { data } = await api.get<ApiResponse<CyberLab>>(`/labs/${slug}`);
    return data.data;
  },
  async create(input: LabFormInput): Promise<CyberLab> {
    const { data } = await api.post<ApiResponse<CyberLab>>('/labs', input);
    return data.data;
  },
  async update(id: string, input: Partial<LabFormInput>): Promise<CyberLab> {
    const { data } = await api.put<ApiResponse<CyberLab>>(`/labs/${id}`, input);
    return data.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/labs/${id}`);
  },
};
