import type { NextConfig } from "next";

/**
 * Origine de l'API quand elle est hébergée ailleurs que le site
 * (ex. https://portfolio-api.onrender.com). Facultatif en local.
 */
const backendOrigin = process.env.BACKEND_ORIGIN?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /*
   * Sortie autonome : `next build` produit un serveur Node minimal dans
   * .next/standalone, avec uniquement les dépendances réellement utilisées.
   * C'est ce que copie le Dockerfile. Vercel l'ignore et fait à sa façon.
   */
  output: "standalone",

  /*
   * Relais /backend/* -> API.
   *
   * Hébergés gratuitement, le site (vercel.app) et l'API (onrender.com) sont
   * sur deux domaines différents. Le cookie de session de l'administration
   * serait alors un « cookie tiers », que Safari et Firefox bloquent : la
   * connexion échouerait. En passant par ce relais, le navigateur ne parle
   * qu'au domaine du site, et le cookie redevient un cookie normal.
   *
   * Côté Vercel : NEXT_PUBLIC_API_URL=/backend/api et BACKEND_ORIGIN=<API>.
   */
  async rewrites() {
    if (!backendOrigin) return [];
    return [{ source: "/backend/:path*", destination: `${backendOrigin}/:path*` }];
  },
};

export default nextConfig;
