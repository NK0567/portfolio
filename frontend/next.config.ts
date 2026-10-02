import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Sortie autonome : `next build` produit un serveur Node minimal dans
   * .next/standalone, avec uniquement les dépendances réellement utilisées.
   * C'est ce que copie le Dockerfile, pour une image de quelques dizaines de
   * Mo au lieu de plusieurs centaines.
   */
  output: "standalone",
};

export default nextConfig;
