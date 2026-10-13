"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  /** Fichier choisi par l'utilisateur, encore brut. */
  file: File;
  onCancel: () => void;
  /** Reçoit l'image recadrée, carrée, en JPEG. */
  onConfirm: (cropped: File) => void;
}

/** Côté de la zone de cadrage à l'écran, en pixels. */
const VIEW = 300;
/** Côté de l'image produite : assez net pour le CV imprimé, assez léger pour le site. */
const OUTPUT = 800;

/**
 * Recadrage de la photo de profil, entièrement dans le navigateur.
 *
 * On fait glisser l'image pour la positionner, on zoome avec le curseur ou
 * la molette, on la fait pivoter par quart de tour. Le résultat est un JPEG
 * carré de 800 px : le format que le PDF du CV sait imprimer (PDFKit ne lit
 * que le JPEG et le PNG), quel que soit le format d'origine (WebP, HEIC
 * converti par le téléphone...). Rien ne part sur le serveur avant
 * validation.
 */
export default function AvatarCropper({ file, onCancel, onConfirm }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Chargement de l'image choisie.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => setError("Cette image n'a pas pu être lue. Essaie un JPEG ou un PNG.");
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /** Échelle de base : l'image couvre entièrement le cadre (comme object-fit: cover). */
  const baseScale = useCallback(
    (img: HTMLImageElement, size: number) => {
      const turned = rotation % 180 !== 0;
      const w = turned ? img.height : img.width;
      const h = turned ? img.width : img.height;
      return Math.max(size / w, size / h);
    },
    [rotation]
  );

  /** Dessine l'image cadrée sur un canvas de côté `size`. */
  const paint = useCallback(
    (target: HTMLCanvasElement, size: number, img: HTMLImageElement) => {
      const ctx = target.getContext('2d');
      if (!ctx) return;
      const ratio = size / VIEW;
      const scale = baseScale(img, size) * zoom;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2 + offset.x * ratio, size / 2 + offset.y * ratio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    },
    [baseScale, offset, rotation, zoom]
  );

  useEffect(() => {
    if (image && canvas.current) paint(canvas.current, VIEW, image);
  }, [image, paint]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const confirm = () => {
    if (!image) return;
    setBusy(true);
    const out = document.createElement('canvas');
    out.width = OUTPUT;
    out.height = OUTPUT;
    paint(out, OUTPUT, image);
    out.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) {
          setError("La conversion de l'image a échoué.");
          return;
        }
        onConfirm(new File([blob], 'photo-profil.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recadrer la photo</h2>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>
        ) : (
          <>
            <div
              className="relative mx-auto cursor-grab touch-none overflow-hidden rounded-lg bg-slate-100 active:cursor-grabbing dark:bg-slate-800"
              style={{ width: VIEW, height: VIEW }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={(e) => setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.0015)))}
            >
              <canvas ref={canvas} width={VIEW} height={VIEW} className="block" />
              {/* Masque : le cercle est ce qui apparaîtra sur le CV et le site. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ boxShadow: `0 0 0 ${VIEW}px rgba(15,23,42,0.55)`, borderRadius: '50%' }}
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80" />
              {!image && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom"
                className="flex-1 accent-indigo-600"
              />
              <ZoomIn className="h-4 w-4 shrink-0 text-slate-400" />
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="ml-2 rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Pivoter d'un quart de tour"
                title="Pivoter"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
            <p className="text-center text-xs text-slate-400">
              Fais glisser pour positionner, molette ou curseur pour zoomer.
            </p>
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
            Annuler
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!image || busy || !!error}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Utiliser cette photo
          </button>
        </div>
      </div>
    </div>
  );
}
