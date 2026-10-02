"use client";

import React from 'react';
import ProtectedRoute from '@/components/auth/protected-route';
import DashboardSidebar from '@/components/ui/dashboard-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/config/auth-context';
import { LogOut } from 'lucide-react';

interface AdminShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Coquille commune à toutes les pages d'administration.
 *
 * Elle regroupe la protection d'accès, la barre latérale, l'en-tête, le
 * sélecteur de thème et la déconnexion. Chaque page se contente ainsi de
 * décrire son contenu, et l'ajout d'un élément de navigation se répercute
 * partout sans copier-coller.
 */
export default function AdminShell({ title, subtitle, actions, children }: AdminShellProps) {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex">
        <DashboardSidebar />

        <main className="flex-1 min-w-0 p-6 md:p-10 space-y-8">
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6 border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                {title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {subtitle ?? (
                  <>
                    Connecté en tant que{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {user?.username ?? user?.email}
                    </span>{' '}
                    ({user?.role})
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {actions}
              <ThemeToggle />
              <button
                onClick={() => logout()}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-2 rounded-lg text-sm transition-colors shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </header>

          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
