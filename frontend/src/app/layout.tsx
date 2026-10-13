import type React from 'react';
import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { getPublic, assetUrl } from '@/lib/server-api';
import type { GlobalConfig, Profile } from '@/types/api';
import './globals.css';

/**
 * Trois familles, trois rôles : Space Grotesk pour les titres (géométrique,
 * technique sans être froid), Inter pour la lecture, JetBrains Mono pour ce
 * qui est réellement du code ou de la donnée.
 */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// Polices variables (sans liste de graisses) : un seul fichier par police,
// plus léger et plus fiable à télécharger pendant la compilation.
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
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

/**
 * Luminance relative WCAG d'une couleur #rrggbb, de 0 (noir) à 1 (blanc).
 *
 * Le site public est sombre : une couleur choisie trop foncée dans
 * l'administration (le #0f172a par défaut, par exemple) y deviendrait
 * invisible. En dessous du seuil, on garde la couleur d'origine du thème.
 */
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const visibleOnDark = (value: unknown, fallback: string): string => {
  const color = safeColor(value, fallback);
  return luminance(color) >= 0.12 ? color : fallback;
};

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
  const accent = visibleOnDark(theme?.accentColor, '#3b82f6');
  const secondary = visibleOnDark(theme?.primaryColor, '#22d3ee');

  const defaultTheme =
    theme?.defaultMode === 'light' || theme?.defaultMode === 'dark'
      ? theme.defaultMode
      : 'system';

  /*
   * Les deux couleurs choisies dans l'écran Site écrasent les néons du site
   * public : l'accent devient le bleu principal (boutons, liens, lueurs),
   * la couleur secondaire le cyan des dégradés. Les fonds et les gris
   * restent fixes, pour qu'aucun réglage ne rende le texte illisible.
   */
  const paletteCss = `:root{--signal:${accent};--cyan:${secondary};}`;

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${inter.variable} ${grotesk.variable} ${jetbrains.variable}`}
    >
      <head>
        <style
          id="palette"
          // Contenu entièrement reconstruit à partir de deux couleurs validées
          // par safeColor : rien de ce que contient la base n'arrive ici brut.
          dangerouslySetInnerHTML={{ __html: paletteCss }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
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
