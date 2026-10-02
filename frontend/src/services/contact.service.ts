import { api } from '@/lib/api';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  isRead: boolean;
  ipAddress: string | null;
  createdAt: string;
}

export interface ContactInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
  /** Champ piège, toujours vide côté humain. */
  website?: string;
}

export interface MessagesPage {
  data: ContactMessage[];
  unread: number;
  pagination: { page: number; limit: number; total: number; pages: number };
}

export const contactService = {
  /** Envoi public, sans authentification. */
  async send(payload: ContactInput): Promise<void> {
    await api.post('/contact', payload);
  },

  /** Boîte de réception de l'administration. */
  async list(page = 1, unreadOnly = false): Promise<MessagesPage> {
    const { data } = await api.get('/contact', {
      params: { page, limit: 20, ...(unreadOnly ? { unreadOnly: '1' } : {}) },
    });

    return {
      data: data.data as ContactMessage[],
      unread: (data.unread as number) ?? 0,
      pagination: data.pagination as MessagesPage['pagination'],
    };
  },

  async setRead(id: string, isRead: boolean): Promise<void> {
    await api.patch(`/contact/${id}`, { isRead });
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/contact/${id}`);
  },
};
