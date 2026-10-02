"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FolderKanban,
  Star,
  Briefcase,
  Globe,
  GraduationCap,
  FileText,
  Mail,
  Inbox,
  ShieldCheck,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: "Vue d'ensemble", href: '/admin', icon: Home },
  { name: 'Projets', href: '/admin/projects', icon: FolderKanban },
  { name: 'Compétences', href: '/admin/skills', icon: Star },
  { name: 'Expériences', href: '/admin/experiences', icon: Briefcase },
  { name: 'Formation', href: '/admin/education', icon: GraduationCap },
  { name: 'Labs sécurité', href: '/admin/labs', icon: ShieldCheck },
  { name: 'Messages', href: '/admin/messages', icon: Inbox },
  { name: 'Lettres de motivation', href: '/admin/cover-letters', icon: Mail },
  { name: 'Logs Sécurité', href: '/admin/logs', icon: FileText },
  { name: 'Site', href: '/admin/site', icon: Globe },
  { name: 'Paramètres', href: '/admin/settings', icon: Settings },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col gap-2 p-4 border-r bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <div className="font-bold text-xl py-4 pl-2 text-indigo-600 dark:text-indigo-400">
        Admin Panel
      </div>

      <nav className="flex flex-col gap-1">
        {navigation.map((item) => {
          /*
           * '/admin' est un préfixe de toutes les autres routes : sans le test
           * d'égalité stricte, « Vue d'ensemble » resterait surligné en
           * permanence, quelle que soit la page ouverte.
           */
          const isActive =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              )}
            >
              <item.icon
                className={cn(
                  'w-5 h-5',
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Voir le site public
        </Link>
      </div>
    </aside>
  );
}
