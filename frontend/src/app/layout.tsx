import type React from 'react';
import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { getPublic, assetUrl } from '@/lib/server-api';
import type { GlobalConfig, Profile } from '@/types/api';
import './globals.css';

/**
 * IBM Plex plutôt qu'Inter ou Poppins.
 *
 * Plex a été dessiné pour la documentation technique et l'ingénierie, et la
 * version monospace appartient à la même famille : les deux se ressemblent
 * sans se confondre. Le mono ne sert pas de décor ici, il sert à ce qui est
 * réellement du code ou de la donnée, noms de technologies et métadonnées.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

/** Valeurs de repli, utilisées quand l'API ne répond pas au moment du build. */
const FALLBACK = {
  name: 'Kalefack Ngouadjeu Boris',
  description:
    "Développeur full stack et ingénieur en sécurité des systèmes d'information. Applications web et mobiles conçues de bout en bout.",
};

/**
 * Couleurs acceptées uniquement au format #rrggbb.
 *
 * Ces valeurs sont injectées dans une balise <style> du document. Le serveur
 * les valide déjà avec la même expression, mais une donnée modifiée
 * directement en base passerait à côté de cette validation. Une chaîne
 * arbitraire écrite dans du CSS n'exécute pas de JavaScript sur les
 * navigateurs actuels, mais elle casserait la feuille de style entière, et
 * c'est une porte qu'on ne laisse pas entrouverte.
 */
const HEX = /^#[0-9a-fA-F]{6}$/;
const safeColor = (value: unknown, fallback: string): string =>
  typeof value === 'string' && HEX.test(value) ? value : fallback;

export const generateMetadata = async (): Promise<Metadata> => {
  const [config, profile] = await Promise.all([
    getPublic<GlobalConfig>('/config', { revalidate: 300 }),
    getPublic<Profile>('/profile', { revalidate: 300 }),
  ]);

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : FALLBACK.name;
  const title = config?.seoConfig?.title?.fr || `${fullName}, développeur full stack`;
  const description =
    config?.seoConfig?.description?.fr || profile?.bio?.fr?.slice(0, 160) || FALLBACK.description;

  const ogImage = assetUrl(config?.seoConfig?.ogImage || null);

  return {
    // Base des URL relatives d'Open Graph (aperçus LinkedIn, WhatsApp...).
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: { default: title, template: `%s | ${fullName}` },
    description,
    keywords: config?.seoConfig?.keywords,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'fr_FR',
      siteName: config?.siteName || fullName,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: { index: true, follow: true },
  };
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getPublic<GlobalConfig>('/config', { revalidate: 300 });

  const theme = config?.themeConfig;
  const primary = safeColor(theme?.primaryColor, '#12263A');
  const accent = safeColor(theme?.accentColor, '#0E8A68');

  const defaultTheme =
    theme?.defaultMode === 'light' || theme?.defaultMode === 'dark'
      ? theme.defaultMode
      : 'system';

  /*
   * La palette choisie en administration écrase les jetons définis dans
   * globals.css, en mode clair comme en mode sombre.
   *
   * C'est ce qui rend l'écran Site réellement utile : sans cette injection,
   * on aurait un formulaire de couleurs qui enregistre en base et ne change
   * rien à l'écran, exactement le genre de fonctionnalité à moitié construite
   * qu'on essaie d'éliminer de ce projet.
   *
   * Seuls `--ink` et `--signal` sont pilotés. Les fonds, les traits et les
   * gris restent fixes : laisser modifier le fond ouvrirait la porte à des
   * combinaisons illisibles, texte gris clair sur blanc par exemple, sans
   * aucun garde-fou de contraste.
   */
  const paletteCss = `:root{--ink:${primary};--signal:${accent};}.dark{--signal:${accent};}`;

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable}`}
    >
      <head>
        <style
          id="palette"
          // Contenu entièrement reconstruit à partir de deux couleurs validées
          // par safeColor : rien de ce que contient la base n'arrive ici brut.
          dangerouslySetInnerHTML={{ __html: paletteCss }}
        />
      </head>
      <body className="min-h-screen bg-paper font-sans text-graphite antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme={defaultTheme}
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
