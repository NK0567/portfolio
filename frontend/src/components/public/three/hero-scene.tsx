"use client";

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, RoundedBox, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Scène d'ouverture : un portable flottant qui affiche un tableau de bord,
 * des cristaux en orbite et une poussière lumineuse. Tout est construit en
 * géométrie simple, sans modèle 3D à télécharger : la scène s'affiche dès
 * que le JavaScript est là, sans fichier de plusieurs Mo en attente.
 *
 * La scène entière s'incline vers la souris (parallaxe), avec un amorti
 * pour que le mouvement reste doux.
 */

const COLORS = {
  signal: '#3b82f6',
  cyan: '#22d3ee',
  violet: '#8b5cf6',
};

/** Écran du portable dessiné dans un canvas 2D : graphique, barres, cartes. */
function useDashboardTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;

    const bg = ctx.createLinearGradient(0, 0, 1024, 640);
    bg.addColorStop(0, '#071230');
    bg.addColorStop(1, '#0b0a2a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 640);

    // Barre latérale
    ctx.fillStyle = 'rgba(59,130,246,0.10)';
    ctx.fillRect(0, 0, 150, 640);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i === 1 ? 'rgba(34,211,238,0.9)' : 'rgba(148,163,184,0.35)';
      ctx.fillRect(28, 70 + i * 54, 94, 10);
    }

    // Cartes de chiffres
    const cards = ['#22d3ee', '#3b82f6', '#8b5cf6'];
    cards.forEach((color, i) => {
      const x = 180 + i * 272;
      ctx.fillStyle = 'rgba(15,23,42,0.85)';
      ctx.strokeStyle = 'rgba(59,130,246,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, 40, 248, 110, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.fillRect(x + 20, 64, 90, 9);
      ctx.fillStyle = color;
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(['99.9%', '1.2k', '24ms'][i]!, x + 20, 126);
    });

    // Graphique en courbe
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.beginPath();
    ctx.roundRect(180, 175, 520, 420, 16);
    ctx.fill();
    const points = Array.from({ length: 14 }, (_, i) => [
      210 + i * 36,
      520 - (Math.sin(i * 0.7) * 70 + i * 16 + (i % 3) * 18),
    ]);
    const area = ctx.createLinearGradient(0, 260, 0, 560);
    area.addColorStop(0, 'rgba(34,211,238,0.45)');
    area.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.beginPath();
    ctx.moveTo(points[0]![0]!, 560);
    points.forEach(([x, y]) => ctx.lineTo(x!, y!));
    ctx.lineTo(points[points.length - 1]![0]!, 560);
    ctx.fillStyle = area;
    ctx.fill();
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x!, y!) : ctx.moveTo(x!, y!)));
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Histogramme
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.beginPath();
    ctx.roundRect(724, 175, 248, 420, 16);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const h = 60 + ((i * 53) % 230);
      const grad = ctx.createLinearGradient(0, 560 - h, 0, 560);
      grad.addColorStop(0, '#8b5cf6');
      grad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = grad;
      ctx.fillRect(748 + i * 36, 560 - h, 22, h);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);
}

function Laptop() {
  const screen = useDashboardTexture();
  const scan = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (scan.current) {
      // Ligne de balayage qui parcourt l'écran de haut en bas.
      scan.current.position.y = 1.0 - ((clock.elapsedTime * 0.35) % 1) * 1.9;
    }
  });

  return (
    <group rotation={[0.18, -0.55, 0]} position={[0, -0.35, 0]}>
      {/* Socle */}
      <RoundedBox args={[3.4, 0.11, 2.25]} radius={0.05} smoothness={4}>
        <meshStandardMaterial color="#141c33" metalness={0.85} roughness={0.28} />
      </RoundedBox>
      {/* Clavier : grille faiblement lumineuse */}
      <mesh position={[0, 0.062, -0.18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.9, 1.15, 14, 5]} />
        <meshBasicMaterial color={COLORS.signal} wireframe transparent opacity={0.22} />
      </mesh>
      {/* Pavé tactile */}
      <mesh position={[0, 0.062, 0.72]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.95, 0.5]} />
        <meshStandardMaterial color="#1b2442" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Écran, articulé à l'arrière du socle */}
      <group position={[0, 0.05, -1.1]} rotation={[-0.22, 0, 0]}>
        <RoundedBox args={[3.4, 2.15, 0.08]} radius={0.05} smoothness={4} position={[0, 1.07, -0.02]}>
          <meshStandardMaterial color="#121a30" metalness={0.85} roughness={0.3} />
        </RoundedBox>
        <mesh position={[0, 1.07, 0.025]}>
          <planeGeometry args={[3.18, 1.95]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
        <mesh ref={scan} position={[0, 1.0, 0.03]}>
          <planeGeometry args={[3.18, 0.05]} />
          <meshBasicMaterial
            color={COLORS.cyan}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Anneau lumineux posé sous le portable */}
      <mesh position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.025, 16, 128]} />
        <meshBasicMaterial color={COLORS.cyan} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 64]} />
        <meshBasicMaterial
          color={COLORS.signal}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

interface CrystalProps {
  position: [number, number, number];
  color: string;
  scale: number;
  shape: 'octa' | 'ico';
  speed: number;
}

function Crystal({ position, color, scale, shape, speed }: CrystalProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.3 * speed;
    ref.current.rotation.y += delta * 0.5 * speed;
  });

  return (
    <Float speed={1.4 * speed} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={ref} position={position} scale={scale}>
        {shape === 'octa' ? <octahedronGeometry args={[1, 0]} /> : <icosahedronGeometry args={[1, 0]} />}
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.55}
          metalness={0.2}
          roughness={0.08}
          clearcoat={1}
          transparent
          opacity={0.88}
          flatShading
        />
      </mesh>
    </Float>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ pointer }, delta) => {
    if (!group.current) return;
    // Amorti exponentiel : la scène rattrape la souris sans à-coups.
    const k = 1 - Math.exp(-delta * 3);
    group.current.rotation.y += (pointer.x * 0.35 - group.current.rotation.y) * k;
    group.current.rotation.x += (-pointer.y * 0.18 - group.current.rotation.x) * k;
  });

  return <group ref={group}>{children}</group>;
}

export default function HeroScene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 4, 4]} intensity={60} color={COLORS.cyan} />
      <pointLight position={[-5, 2, -2]} intensity={50} color={COLORS.violet} />
      <directionalLight position={[0, 5, 5]} intensity={0.8} />

      <Rig>
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.6}>
          <Laptop />
        </Float>

        <Crystal position={[2.6, 1.7, -0.5]} color={COLORS.signal} scale={0.38} shape="octa" speed={1} />
        <Crystal position={[-2.8, 1.2, -1]} color={COLORS.violet} scale={0.3} shape="ico" speed={0.8} />
        <Crystal position={[2.9, -1.2, 0.6]} color={COLORS.cyan} scale={0.45} shape="ico" speed={1.2} />
        <Crystal position={[-2.3, -1.5, 0.8]} color={COLORS.violet} scale={0.25} shape="octa" speed={1.4} />
        <Crystal position={[0.4, 2.4, -1.6]} color={COLORS.cyan} scale={0.2} shape="octa" speed={0.9} />

        <Sparkles count={70} scale={[9, 6, 5]} size={2.2} speed={0.35} color={COLORS.cyan} opacity={0.7} />
      </Rig>
    </>
  );
}
