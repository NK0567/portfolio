"use client";

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export interface OrbitItem {
  name: string;
  level: number;
  years: number;
}

interface Props {
  items: OrbitItem[];
  /** Désactive la rotation à la souris : sur écran tactile, le doigt doit faire défiler la page. */
  interactive: boolean;
}

/**
 * Orbite des technologies.
 *
 * Les compétences les mieux maîtrisées tournent sur trois anneaux inclinés
 * autour d'un noyau lumineux. Les étiquettes sont du HTML posé dans la
 * scène : texte net à toute taille, lisible par un lecteur d'écran, et
 * aucune police 3D à télécharger.
 */

const RINGS = [
  { radius: 2.3, tilt: [Math.PI / 2.4, 0, 0.2] as const, speed: 0.22, color: '#22d3ee' },
  { radius: 3.1, tilt: [Math.PI / 2.1, 0, -0.45] as const, speed: -0.15, color: '#3b82f6' },
  { radius: 3.9, tilt: [Math.PI / 1.8, 0, 0.6] as const, speed: 0.1, color: '#8b5cf6' },
];

function Core() {
  const shell = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!shell.current) return;
    shell.current.rotation.y += delta * 0.4;
    shell.current.rotation.x += delta * 0.15;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.75, 48, 48]} />
        <meshStandardMaterial color="#1d4ed8" emissive="#3b82f6" emissiveIntensity={1.4} roughness={0.2} />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.45} />
      </mesh>
      {/* Halo : sphère arrière en mélange additif */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Node({ item, angle, radius, color }: { item: OrbitItem; angle: number; radius: number; color: string }) {
  const [hover, setHover] = useState(false);
  const position: [number, number, number] = [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <Html center distanceFactor={9} zIndexRange={[20, 0]}>
        <div
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
          className="flex select-none flex-col items-center gap-1.5"
        >
          <div
            className="neon-ring flex h-14 w-14 items-center justify-center rounded-full font-display text-sm font-bold text-ink transition-transform duration-300"
            style={{ transform: hover ? 'scale(1.15)' : undefined }}
          >
            {initials(item.name)}
          </div>
          <span className="whitespace-nowrap rounded-full bg-paper/80 px-2.5 py-0.5 text-xs font-medium text-ink">
            {item.name}
          </span>
          {hover && (
            <span className="whitespace-nowrap font-mono text-[10px] text-cyan">
              {item.level}% · {item.years} {item.years > 1 ? 'ans' : 'an'}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

/** « Node.js » -> « No », « React.js » -> « Re », « Spring Boot » -> « SB » */
const initials = (name: string) => {
  const words = name.replace(/\.js$/i, '').split(/[\s.-]+/).filter(Boolean);
  if (words.length > 1) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  const word = words[0] ?? name;
  return word.slice(0, 2).charAt(0).toUpperCase() + word.slice(1, 2);
};

function Ring({ index, items }: { index: number; items: OrbitItem[] }) {
  const ring = RINGS[index]!;
  const spinner = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (spinner.current) spinner.current.rotation.z += delta * ring.speed;
  });

  return (
    <group rotation={ring.tilt as unknown as THREE.Euler}>
      <mesh>
        <torusGeometry args={[ring.radius, 0.012, 12, 160]} />
        <meshBasicMaterial color={ring.color} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <group ref={spinner}>
        {items.map((item, i) => (
          <Node
            key={item.name}
            item={item}
            radius={ring.radius}
            color={ring.color}
            angle={(i / items.length) * Math.PI * 2 + index}
          />
        ))}
      </group>
    </group>
  );
}

export default function OrbitScene({ items, interactive }: Props) {
  // Répartition sur les anneaux : 3 au centre, 4 au milieu, le reste dehors.
  const rings = useMemo(() => [items.slice(0, 3), items.slice(3, 7), items.slice(7, 12)], [items]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={30} color="#22d3ee" />

      <Core />
      {rings.map((ringItems, index) =>
        ringItems.length > 0 ? <Ring key={index} index={index} items={ringItems} /> : null
      )}
      <Sparkles count={80} scale={[10, 8, 6]} size={1.8} speed={0.25} color="#93c5fd" opacity={0.6} />

      <OrbitControls
        enabled={interactive}
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.5}
        rotateSpeed={0.6}
      />
    </>
  );
}
