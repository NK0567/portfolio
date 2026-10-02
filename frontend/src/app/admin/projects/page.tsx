"use client";

import AdminShell from '@/components/admin/admin-shell';
import ProjectsManager from '@/components/admin/projects-manager';

export default function AdminProjectsPage() {
  return (
    <AdminShell
      title="Projets"
      subtitle="Chaque projet et ses technologies alimentent le portfolio public et ton CV."
    >
      <ProjectsManager />
    </AdminShell>
  );
}
