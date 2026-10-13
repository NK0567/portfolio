"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { contactService } from '@/services/contact.service';
import { getErrorMessage } from '@/lib/api';

interface Props {
  email: string | null;
}

/**
 * Formulaire de contact.
 *
 * Le message part en base et se lit dans l'administration (écran Messages).
 * Le champ « website », invisible, est un piège à robots : un humain ne le
 * voit pas, un robot le remplit, et le serveur ignore alors le message.
 */
export default function ContactForm({ email }: Props) {
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

  const remaining = Math.max(0, 20 - form.message.trim().length);

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-4 rounded-2xl border border-success/40 bg-success/10 p-6"
        >
          <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 0.15 }}>
            <CheckCircle2 className="h-7 w-7 text-success" />
          </motion.span>
          <div>
            <p className="font-display text-lg font-semibold text-ink">Message bien reçu, merci.</p>
            <p className="mt-1 text-sm text-haze">
              Je réponds sous 48 heures ouvrées.{' '}
              <button type="button" onClick={() => setSent(false)} className="text-cyan underline underline-offset-2">
                Écrire un autre message
              </button>
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.form key="form" exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error && (
            <p className="whitespace-pre-line rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink">
              Nom
              <input
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Votre nom ou celui de votre entreprise"
                className="field"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Adresse e-mail
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="vous@entreprise.com"
                className="field"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-ink">
            Sujet
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Proposition de poste, mission, question technique"
              className="field"
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            Message
            <textarea
              required
              rows={6}
              minLength={20}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Parlez-moi du projet, de l'équipe, du calendrier…"
              className="field resize-y"
            />
            <span className="mt-1.5 block text-xs font-normal text-haze">
              {remaining > 0 ? `Encore ${remaining} caractère${remaining > 1 ? 's' : ''} minimum` : '✓ Prêt à partir'}
            </span>
          </label>

          {/* Piège à robots : invisible pour les humains, rempli par les robots. */}
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

          <button type="submit" disabled={sending} className="btn-primary">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'Envoi…' : 'Envoyer le message'}
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
