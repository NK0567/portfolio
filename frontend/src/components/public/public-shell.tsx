import React from 'react';
import Ambient from './fx/ambient';
import SiteHeader from './site-header';
import SiteFooter from './site-footer';
import type { GlobalConfig } from '@/types/api';

interface Props {
  name: string;
  config: GlobalConfig | null;
  children: React.ReactNode;
}

/**
 * Habillage commun des pages publiques : fond animé, barre de lecture,
 * en-tête et pied de page. L'accueil, les fiches projet et les write-ups
 * partagent ainsi exactement la même identité visuelle.
 */
export default function PublicShell({ name, config, children }: Props) {
  return (
    <div className="public-site">
      <Ambient />
      <SiteHeader name={name} />
      {children}
      <SiteFooter name={name} config={config} />
    </div>
  );
}
