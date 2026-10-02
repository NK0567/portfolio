import { z } from 'zod';

/**
 * Politique de mot de passe.
 *
 * La longueur minimale compte davantage que la complexité : on exige 12
 * caractères plutôt que 8 avec un symbole obligatoire, ce qui pousse
 * naturellement vers des phrases de passe, plus solides et plus mémorisables.
 */
const password = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères.')
  .max(128, 'Le mot de passe est trop long.')
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v), 'Il faut au moins une minuscule et une majuscule.')
  .refine((v) => /[0-9]/.test(v), 'Il faut au moins un chiffre.');


/**
 * Email normalisé AVANT validation.
 *
 * L'ordre compte : `z.email().trim()` valide d'abord et nettoie ensuite, si
 * bien qu'un utilisateur qui laisse une espace après son adresse (copier-coller
 * ou correction automatique du clavier mobile) se voit refuser la connexion.
 * Ici on nettoie d'abord, puis on valide via `.pipe()`.
 */
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Adresse email invalide.'));

export const registerSchema = z.object({
  email: emailField,
  username: z
    .string()
    .min(3, "Le nom d'utilisateur doit faire au moins 3 caractères.")
    .max(30)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Caractères autorisés : lettres, chiffres, . _ -")
    .trim(),
  password,
});

export const loginSchema = z.object({
  email: emailField,
  // Volontairement permissif : on ne révèle pas la politique de mot de passe
  // à l'écran de connexion, et un ancien mot de passe court doit rester utilisable.
  password: z.string().min(1, 'Mot de passe requis.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis.'),
  newPassword: password,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
