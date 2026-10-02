"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/config/auth-context';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si la vérification est terminée et l'utilisateur n'est pas connecté
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Si l'application vérifie encore la session, on affiche un loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Si non connecté, on ne rend rien le temps que la redirection s'exécute
  if (!user) {
    return null;
  }

  // Si authentifié, on affiche la page
  return <>{children}</>;
}