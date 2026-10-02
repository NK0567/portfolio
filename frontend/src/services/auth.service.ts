import { api } from '@/lib/api';

export interface LoginCredentials {
  email: string;
  password: string; // Mis à jour : correspond exactement à ce qu'attend req.body sur Express
}

export const authService = {
  /**
   * Tente de connecter un utilisateur
   */
  async login(credentials: LoginCredentials) {
    // Envoie { email, password } directement au backend Express
    const response = await api.post('/auth/login', credentials);
    return response.data; // Retourne { success: true, user: { ... }, accessToken: "..." }
  },

  /**
   * Récupère les informations de l'utilisateur connecté grâce au cookie/token
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data; // Retourne { success: true, user: { ... } }
  },

  /**
   * Déconnecte l'utilisateur et nettoie les cookies côté backend
   */
  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};