"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Mail, MailOpen, Reply, Trash2 } from 'lucide-react';

import AdminShell from '@/components/admin/admin-shell';
import { contactService, type ContactMessage } from '@/services/contact.service';
import { getErrorMessage } from '@/lib/api';

/**
 * Messages reçus depuis le formulaire de contact public.
 *
 * Sans cet écran, le formulaire enregistrerait des messages que personne ne
 * lirait jamais. Les deux vont ensemble.
 */
export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await contactService.list(page, unreadOnly);
      setMessages(result.data);
      setUnread(result.unread);
      setPages(result.pagination.pages);
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger les messages.'));
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Ouvrir un message le marque comme lu.
   *
   * La mise à jour est appliquée à l'écran avant la réponse du serveur, pour
   * que le clic paraisse instantané. En cas d'échec, l'état est remis comme
   * il était : afficher « lu » sur un message qui est resté non lu en base
   * ferait disparaître un message du filtre sans raison visible.
   */
  const handleOpen = async (message: ContactMessage) => {
    const next = openId === message.id ? null : message.id;
    setOpenId(next);

    if (next === null || message.isRead) return;

    setMessages((list) => list.map((m) => (m.id === message.id ? { ...m, isRead: true } : m)));
    setUnread((count) => Math.max(0, count - 1));

    try {
      await contactService.setRead(message.id, true);
    } catch {
      setMessages((list) => list.map((m) => (m.id === message.id ? { ...m, isRead: false } : m)));
      setUnread((count) => count + 1);
      setError("Le message n'a pas pu être marqué comme lu.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer définitivement ce message ?')) return;

    try {
      await contactService.remove(id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Suppression impossible.'));
    }
  };

  return (
    <AdminShell
      title="Messages"
      subtitle={
        unread > 0
          ? `${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}`
          : 'Aucun message non lu'
      }
      actions={
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            checked={unreadOnly}
            onChange={(e) => {
              setPage(1);
              setUnreadOnly(e.target.checked);
            }}
          />
          Non lus seulement
        </label>
      }
    >
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <Mail className="mx-auto mb-3 h-7 w-7 text-slate-400" />
          <p className="text-sm text-slate-500">
            {unreadOnly ? 'Tout est lu.' : 'Aucun message pour le moment.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {messages.map((message) => {
            const isOpen = openId === message.id;

            return (
              <li
                key={message.id}
                className={[
                  'rounded-xl border transition-colors',
                  message.isRead
                    ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    : 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-900 dark:bg-indigo-950/20',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => void handleOpen(message)}
                  className="flex w-full items-start gap-3 p-4 text-left"
                >
                  {message.isRead ? (
                    <MailOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {message.name}
                      </span>
                      <span className="truncate text-xs text-slate-400">{message.email}</span>
                    </div>

                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                      {message.subject || 'Sans sujet'}
                    </p>

                    {!isOpen && (
                      <p className="mt-1 truncate text-xs text-slate-400">{message.message}</p>
                    )}
                  </div>

                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(message.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {message.message}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <a
                        href={`mailto:${message.email}?subject=${encodeURIComponent(
                          `Re: ${message.subject || 'Ton message'}`
                        )}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                      >
                        <Reply className="h-4 w-4" />
                        Répondre
                      </a>

                      <button
                        type="button"
                        onClick={() => void handleDelete(message.id)}
                        className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>

                    {message.ipAddress && (
                      <p className="mt-3 font-mono text-[11px] text-slate-400">
                        Reçu depuis {message.ipAddress}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-700"
          >
            Précédent
          </button>
          <span className="text-sm text-slate-500">
            Page {page} sur {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-700"
          >
            Suivant
          </button>
        </div>
      )}
    </AdminShell>
  );
}
