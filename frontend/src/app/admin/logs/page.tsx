"use client";

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/protected-route';
import DashboardSidebar from '@/components/ui/dashboard-sidebar';
import { api } from '@/lib/api';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    email: string;
    username: string;
  };
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/logs?limit=100');
        if (res.data?.success) {
          setLogs(res.data.data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des logs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('SUCCESS')) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (action.includes('FAILED') || action.includes('DELETE')) return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    if (action.includes('UPDATE')) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
    if (action.includes('CREATE')) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex">
        <DashboardSidebar />
        <main className="flex-1 p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between border-b pb-6 border-slate-200 dark:border-slate-800">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                Moniteur de Sécurité
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Journal d'audit et activités système.
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Chargement de l'historique...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Aucun log enregistré.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Action</th>
                      <th className="px-6 py-4 font-medium">Utilisateur</th>
                      <th className="px-6 py-4 font-medium">Ressource</th>
                      <th className="px-6 py-4 font-medium">Détails IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(log.createdAt))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                          {log.user ? (
                            <div>
                              <span className="font-medium">{log.user.username}</span>
                              <span className="text-xs block text-slate-400">{log.user.email}</span>
                            </div>
                          ) : 'Système / Inconnu'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {log.resource}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-500">
                          {log.ipAddress || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
