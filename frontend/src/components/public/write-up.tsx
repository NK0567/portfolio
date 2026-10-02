import React from 'react';

interface Props {
  source: string;
}

/**
 * Rendu d'un write-up saisi dans l'administration.
 *
 * Trois constructions seulement : paragraphes séparés par une ligne vide,
 * intertitres `## Titre`, blocs de commandes entre trois accents graves.
 * C'est tout ce qu'un write-up demande, et c'est assez peu pour se passer
 * d'une bibliothèque Markdown.
 *
 * Surtout, aucun HTML n'est interprété : tout passe par React, qui échappe
 * le texte. Un write-up contient par nature des charges utiles (`<script>`,
 * `' OR 1=1 --`) qui doivent s'afficher telles quelles, jamais s'exécuter.
 */

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'paragraph'; text: string };

const parse = (source: string): Block[] => {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let buffer: string[] = [];

  const flush = () => {
    const paragraph = buffer.join('\n').trim();
    if (paragraph) blocks.push({ kind: 'paragraph', text: paragraph });
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (line.trim().startsWith('```')) {
      flush();
      const code: string[] = [];
      i++;
      // Un bloc non refermé court jusqu'à la fin : on n'avale pas de texte en silence.
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) {
        code.push(lines[i]!);
        i++;
      }
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }

    const heading = /^#{2,3}\s+(.+)$/.exec(line.trim());
    if (heading) {
      flush();
      blocks.push({ kind: 'heading', text: heading[1]!.trim() });
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    buffer.push(line);
  }

  flush();
  return blocks;
};

/** `commande` en ligne -> <code>, le reste en texte brut. */
const inline = (value: string): React.ReactNode[] =>
  value.split(/(`[^`\n]+`)/g).map((part, index) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
      <code key={index} className="rounded-sm bg-rule/50 px-1 py-0.5 font-mono text-[0.9em] text-ink">
        {part.slice(1, -1)}
      </code>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  );

export default function WriteUp({ source }: Props) {
  return (
    <div className="max-w-[68ch] space-y-4 leading-relaxed text-graphite">
      {parse(source).map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <h3 key={index} className="pt-4 text-lg font-semibold text-ink">
              {block.text}
            </h3>
          );
        }
        if (block.kind === 'code') {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-sm border border-rule bg-rule/30 p-4 font-mono text-[13px] leading-6 text-ink"
            >
              <code>{block.text}</code>
            </pre>
          );
        }
        return (
          <p key={index} className="whitespace-pre-line">
            {inline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
