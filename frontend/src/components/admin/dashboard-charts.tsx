"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/lib/api';

export default function DashboardCharts() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        if (res.data?.success) {
          setStats(res.data.data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const techData = [
    { name: 'Projets', value: stats?.totalProjects || 0 },
    { name: 'Compétences', value: stats?.totalSkills || 0 },
    { name: 'Expériences', value: stats?.totalExperiences || 0 },
    { name: 'Activités (7j)', value: stats?.recentActivitiesCount || 0 },
  ];
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const viewData = [
    { name: 'Lun', vues: 400 },
    { name: 'Mar', vues: 300 },
    { name: 'Mer', vues: 550 },
    { name: 'Jeu', vues: 450 },
    { name: 'Ven', vues: 700 },
    { name: 'Sam', vues: 200 },
    { name: 'Dim', vues: 350 },
  ];

  if (loading) return <div className="p-4 text-center text-slate-500">Chargement des statistiques...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Vues du Portfolio (7 derniers jours)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={viewData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
              <Bar dataKey="vues" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Répartition par Technologie
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex justify-center items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={techData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {techData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
