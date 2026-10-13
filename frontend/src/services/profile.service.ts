import { api } from '@/lib/api';
import type { ApiResponse, Profile } from '@/types/api';

export interface ProfileFormInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneAlt?: string;
  location?: string;
  birthDate?: string | null;
  headline?: { fr: string; en: string };
  bio?: { fr: string; en: string };
  titles?: { fr: string[]; en: string[] };
  languages?: Array<{ name: string; level: string; nameEn?: string; levelEn?: string }>;
  interests?: { fr: string[]; en: string[] };
  avatar?: File | null;
  /** null retire la photo. */
  avatarUrl?: string | null;
}

export const profileService = {
  async get(): Promise<Profile | null> {
    try {
      const { data } = await api.get<ApiResponse<Profile>>('/profile');
      return data.data;
    } catch {
      // 404 tant que le profil n'a pas été configuré : ce n'est pas une erreur.
      return null;
    }
  },

  async save(input: ProfileFormInput): Promise<Profile> {
    if (input.avatar) {
      const fd = new FormData();
      Object.entries(input).forEach(([key, value]) => {
        if (key === 'avatar' || value === undefined || value === null) return;
        fd.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });
      fd.append('avatar', input.avatar);
      const { data } = await api.put<ApiResponse<Profile>>('/profile', fd);
      return data.data;
    }

    const { avatar: _avatar, ...rest } = input;
    const { data } = await api.put<ApiResponse<Profile>>('/profile', rest);
    return data.data;
  },
};
