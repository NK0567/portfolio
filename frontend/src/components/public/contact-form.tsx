"use client";

import React, { useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { contactService } from '@/services/contact.service';
import { getErrorMessage } from '@/lib/api';

const fieldClass =
  'mt-1.5 w-full rounded-sm border border-rule bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-haze/70 focus:border-signal focus:outline-none';

interface Props {
  email: string | null;
  phone: string | null;
}

/**
 * Formulaire de contact.
 *
 * Il remplace l'adresse écrite en dur dans le code. Une adresse affichée en
 * clair est aspirée par les robots en quelques jours, et surtout elle oblige
 * le visiteur à ouvrir son client mail, ce que peu de gens font depuis un
 * téléphone. Le message part en base et se lit dans l'administration.
 *
 * L'adresse reste affichée en dessous pour qui préfère écrire directement.
 */
export default function ContactForm({ email, phone }: Props) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);

    try {
      await contactService.send({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || undefined,
        message: form.message.trim(),
        website: form.website,
      });

      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '', website: '' });
    } catch (err) {
      /*
       * Le cas le plus probable n'est pas une faute de saisie, c'est le
       * plafond de requêtes du backend (429) ou l'API arrêtée. On le dit
       * franchement et on redonne l'adresse, au lieu d'un « une erreur est
       * survenue » qui laisse la personne sans solution.
       */
      setError(
        getErrorMessage(
          err,
          email
            ? `L'envoi a échoué. Tu peux écrire directement à ${email}.`
            : "L'envoi a échoué. Réessaie dans quelques minutes."
        )
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-sm border border-signal/40 bg-signal/5 p-6">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
        <div>
          <p className="font-medium text-ink">Message envoyé.</p>
          <p className="mt-1 text-sm text-haze">
            Je réponds sous 48 heures ouvrées.{' '}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-signal underline underline-offset-2"
            >
              Écrire un autre message
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <p className="rounded-sm border border-red-300 bg-red-50 p-3 text-sm whitespace-pre-line text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-ink">
              Nom
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="text-sm font-medium text-ink">
            Sujet
          </label>
          <input
            id="subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Proposition de poste, mission, question technique"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="message" className="text-sm font-medium text-ink">
            Message
          </label>
          <textarea
            id="message"
            required
            rows={6}
            minLength={20}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-haze">{form.message.trim().length} caractères, 20 minimum</p>
        </div>

        {/*
          * Piège à robots. Invisible à l'écran et retiré de l'ordre de
          * tabulation et des lecteurs d'écran, donc inatteignable pour un
          * humain. Un robot qui remplit tous les champs se trahit, et le
          * serveur rejette. Aucun captcha, aucune donnée envoyée à un tiers.
          */}
        <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="website">Ne pas remplir</label>
          <input
            id="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Envoyer le message
        </button>
      </form>

      <aside className="space-y-5 text-sm lg:border-l lg:border-rule lg:pl-8">
        {email && (
          <div>
            <p className="font-medium text-ink">E-mail</p>
            <a
              href={`mailto:${email}`}
              className="mt-1 block break-all font-mono text-xs text-signal hover:underline"
            >
              {email}
            </a>
          </div>
        )}

        {phone && (
          <div>
            <p className="font-medium text-ink">Téléphone</p>
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="mt-1 block font-mono text-xs text-signal hover:underline">
              {phone}
            </a>
          </div>
        )}

        <p className="text-xs leading-relaxed text-haze">
          Les messages arrivent directement dans l&apos;administration du site. Aucune newsletter,
          aucun partage de ton adresse.
        </p>
      </aside>
    </div>
  );
}
