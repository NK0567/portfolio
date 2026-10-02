import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Client HTTP UNIQUE de l'application.
 *
 * Tu avais deux instances axios en parallèle (src/config/api.ts et celle
 * exportée depuis auth-context.tsx), avec des comportements différents sur
 * les 401. Supprime src/config/api.ts : tout doit passer par ce fichier.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api';
const isDev = process.env.NODE_ENV !== 'production';

export const api = axios.create({
  baseURL: API_URL,
  // Indispensable pour que le cookie httpOnly du refresh token circule.
  withCredentials: true,
});

/* ---------------- Jeton d'accès en mémoire ----------------
 * Volontairement PAS dans localStorage : un script injecté (XSS) peut lire
 * localStorage, mais pas une variable de module. Après un F5, le jeton est
 * perdu et regagné automatiquement via /auth/refresh, dont le cookie, lui,
 * est httpOnly et donc inaccessible au JavaScript.
 */
let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/* ---------------- Renouvellement automatique ---------------- */

interface RetriableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * Empêche la tempête de refresh : si cinq requêtes échouent en 401 au même
 * instant, une seule appelle /auth/refresh, les autres attendent son résultat.
 */
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  refreshPromise ??= axios
    .post<{ accessToken: string }>(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
    .then((res) => {
      const token = res.data?.accessToken ?? null;
      setAccessToken(token);
      return token;
    })
    .catch(() => {
      setAccessToken(null);
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequest | undefined;
    const url = original?.url ?? '';

    // Ne jamais tenter de rafraîchir sur ces routes : on partirait en boucle.
    const isAuthRoute =
      url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/logout');

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;

      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }

    /*
     * Trace en console pour toute erreur serveur, en développement seulement.
     *
     * Sans ça, un 500 arrive dans l'interface sous la forme « Une erreur
     * interne est survenue », et il faut ouvrir l'onglet Réseau pour savoir
     * ce qui s'est réellement passé. Le message utile est pourtant déjà dans
     * la réponse, le frontend ne le lisait simplement pas.
     */
    if (isDev && (error.response?.status ?? 0) >= 500) {
      const payload = error.response?.data as { debug?: string } | undefined;
      console.error(
        `[API] ${error.response?.status} sur ${original?.method?.toUpperCase() ?? 'GET'} ${url}`,
        payload?.debug ?? error.message
      );
    }

    return Promise.reject(error);
  }
);

/**
 * Extrait un message lisible depuis une erreur axios.
 *
 * Trois formats sont gérés :
 *
 * 1. Le 422 du backend, qui liste les champs fautifs :
 *    { message: "Données invalides.", errors: [{ field: "date", message: "..." }] }
 *
 * 2. Le 500, dont le vrai motif est dans `debug`. Ce champ n'est ajouté par
 *    error.middleware qu'en développement, jamais en production : on peut
 *    donc l'afficher sans risquer d'exposer la structure interne à un
 *    visiteur. C'est ce qui manquait, et qui obligeait à fouiller l'onglet
 *    Réseau à chaque incident.
 *
 * 3. Les pannes réseau, où `error.response` est absent : serveur arrêté,
 *    CORS refusé, machine hors ligne. Le message d'axios étant « Network
 *    Error », sans la moindre piste, on dit explicitement quoi vérifier.
 */
export const getErrorMessage = (error: unknown, fallback = 'Une erreur est survenue.'): string => {
  if (axios.isAxiosError(error)) {
    // Aucune réponse : la requête n'a jamais atteint le serveur.
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return 'Le serveur met trop de temps à répondre.';
      }
      return isDev
        ? `Impossible de joindre l'API sur ${API_URL}. Vérifie que le backend tourne et que l'origine du front est autorisée dans CORS_ORIGINS.`
        : "Impossible de joindre le serveur. Vérifie ta connexion.";
    }

    const data = error.response.data as
      | {
          message?: string;
          debug?: string;
          errors?: Array<{ field: string; message: string }>;
        }
      | undefined;

    if (data?.errors?.length) {
      return data.errors.map((e) => `${e.field} : ${e.message}`).join('\n');
    }

    // En développement, le motif réel prime sur le message générique.
    if (isDev && data?.debug) {
      return `${data.message ?? 'Erreur serveur'}\n${data.debug}`;
    }

    if (data?.message) return data.message;
    if (error.message) return error.message;
  }

  if (error instanceof Error) return error.message;
  return fallback;
};

// Export par défaut pour rester compatible avec les imports existants
// (`import api from '@/lib/api'`).
export default api;