"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, getAccessToken, setAccessToken } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /*
   * React exécute les effets deux fois en mode strict, en développement.
   * Sans ce garde-fou, la séquence de démarrage part deux fois, et deux
   * appels simultanés à /auth/refresh font tourner le jeton : le second
   * invalide la session créée par le premier.
   */
  const bootstrapped = useRef(false);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Restauration de session au montage.
   *
   * Ce provider est monté DEUX FOIS dans l'application : une fois autour de
   * la page de connexion, une fois dans app/admin/layout.tsx. Ce sont deux
   * instances React distinctes, qui ne partagent aucun état. Après une
   * connexion réussie, la navigation vers /admin monte donc un provider
   * neuf, avec user à null, qui doit retrouver la session tout seul.
   *
   * Deux chemins, dans cet ordre précis.
   *
   * 1. Le jeton d'accès est encore en mémoire. C'est le cas après une
   *    navigation côté client, puisqu'il vit dans une variable de module de
   *    lib/api.ts, qui survit au changement de page. GET /auth/me suffit
   *    alors, sans toucher au cookie ni déclencher de rotation.
   *
   * 2. Pas de jeton : on sort d'un rechargement complet, la variable de
   *    module est repartie à zéro. Seul /auth/refresh peut réussir, grâce au
   *    cookie httpOnly.
   *
   * L'ancienne version appelait /auth/me en premier dans tous les cas, donc
   * sans en-tête Authorization après un F5 : un 401 garanti à chaque
   * chargement. La version suivante a appelé /auth/refresh en premier dans
   * tous les cas, ce qui a cassé l'entrée dans /admin dès que le cookie
   * n'était pas exploitable. Tester le jeton règle les deux.
   */
  const bootstrap = useCallback(async () => {
    const existing = getAccessToken();

    if (existing) {
      try {
        const me = await api.get('/auth/me');
        setToken(existing);
        setUser((me.data?.user as User) ?? null);
        setLoading(false);
        return;
      } catch {
        // Jeton expiré ou secrets changés : on bascule sur le cookie.
      }
    }

    try {
      const refreshed = await api.post('/auth/refresh', {});
      const accessToken: string | null = refreshed.data?.accessToken ?? null;

      if (!accessToken) {
        clearAuth();
        return;
      }

      setAccessToken(accessToken);
      setToken(accessToken);

      // /auth/refresh renvoie déjà l'utilisateur : inutile de le redemander.
      if (refreshed.data?.user) {
        setUser(refreshed.data.user as User);
        return;
      }

      const me = await api.get('/auth/me');
      setUser((me.data?.user as User) ?? null);
    } catch {
      /*
       * Aucun cookie, cookie expiré, session supprimée côté serveur, ou
       * secrets JWT changés depuis la dernière connexion. Dans tous ces cas
       * la conclusion est la même : personne n'est connecté. ProtectedRoute
       * se charge de rediriger vers /login.
       */
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    void bootstrap();
  }, [bootstrap]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });

    const accessToken: string | null = res.data?.accessToken ?? null;
    if (!accessToken) {
      throw new Error(res.data?.message ?? 'Échec de la connexion.');
    }

    setAccessToken(accessToken);
    setToken(accessToken);
    setUser((res.data?.user as User) ?? null);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /*
       * Échec silencieux volontaire. Si le serveur ne répond pas, on ne
       * retient pas quelqu'un sur une page d'administration au motif que la
       * déconnexion côté serveur a échoué. Le jeton local est effacé dans le
       * finally, ce qui rend la session inutilisable depuis ce navigateur.
       */
    } finally {
      clearAuth();
      /*
       * window.location plutôt que router.push : on veut une page neuve.
       * Une navigation Next conserverait en mémoire les données déjà
       * chargées par les écrans d'administration.
       */
      window.location.href = '/login';
    }
  }, [clearAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isLoading: loading,
        /*
         * `user || token` et non `user` seul.
         *
         * Juste après la connexion, l'utilisateur et le jeton sont posés
         * ensemble, donc les deux formes se valent. Mais si /auth/me échoue
         * alors que le jeton est valide, exiger `user` ferait considérer la
         * personne comme déconnectée et la renverrait sur /login en boucle.
         * C'est exactement le blocage qu'a provoqué la version précédente.
         * Les routes serveur vérifient le jeton à chaque appel de toute
         * façon : rien n'est accessible avec un jeton invalide.
         */
        isAuthenticated: Boolean(user || token),
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé au sein d'un AuthProvider");
  }
  return context;
};