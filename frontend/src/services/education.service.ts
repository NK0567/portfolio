import { api } from '@/lib/api';
import type { ApiResponse, Education, I18nText } from '@/types/api';

export interface EducationFormInput {
  degree: I18nText;
  school: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: I18nText;
  order?: number;
}

export const educationService = {
  async getAll(): Promise<Education[]> {
    const { data } = await api.get<ApiResponse<Education[]>>('/education');
    return data.data ?? [];
  },
  async create(input: EducationFormInput): Promise<Education> {
    const { data } = await api.post<ApiResponse<Education>>('/education', input);
    return data.data;
  },
  async update(id: string, input: Partial<EducationFormInput>): Promise<Education> {
    const { data } = await api.put<ApiResponse<Education>>(`/education/${id}`, input);
    return data.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/education/${id}`);
  },
};
