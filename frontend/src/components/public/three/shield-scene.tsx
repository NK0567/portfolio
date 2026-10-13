"use client";

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Bouclier de la section Sécurité : un écusson extrudé, un cadenas, une
 * sphère de particules qui tourne autour, et deux anneaux de « scan ».
 */

/** Contour d'un écusson classique, pointe vers le bas. */
const shieldShape = (scale: number) => {
  const s = new THREE.Shape();
  const w = 1.3 * scale;
  const top = 1.55 * scale;
  s.moveTo(0, top);
  s.bezierCurveTo(w * 0.45, top - 0.05 * scale, w * 0.8, top - 0.25 * scale, w, top - 0.2 * scale);
  s.lineTo(w, 0.2 * scale);
  s.bezierCurveTo(w, -0.75 * scale, w * 0.45, -1.3 * scale, 0, -1.65 * scale);
  s.bezierCurveTo(-w * 0.45, -1.3 * scale, -w, -0.75 * scale, -w, 0.2 * scale);
  s.lineTo(-w, top - 0.2 * scale);
  s.bezierCurveTo(-w * 0.8, top - 0.25 * scale, -w * 0.45, top - 0.05 * scale, 0, top);
  return s;
};

function Shield() {
  const outer = useMemo(
    () =>
      new THREE.ExtrudeGeometry(shieldShape(1), {
        depth: 0.28,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.06,
        bevelSegments: 4,
        curveSegments: 32,
      }).center(),
    []
  );
  const inner = useMemo(
    () =>
      new THREE.ExtrudeGeometry(shieldShape(0.78), {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 3,
        curveSegments: 32,
      }).center(),
    []
  );

  return (
    <group>
      <mesh geometry={outer}>
        <meshPhysicalMaterial
          color="#0b1d4a"
          emissive="#1d4ed8"
          emissiveIntensity={0.35}
          metalness={0.6}
          roughness={0.18}
          clearcoat={1}
          transparent
          opacity={0.92}
        />
        <Edges threshold={20} color="#22d3ee" />
      </mesh>
      <mesh geometry={inner} position={[0, 0, 0.2]}>
        <meshStandardMaterial color="#123a8c" emissive="#3b82f6" emissiveIntensity={0.6} metalness={0.4} roughness={0.25} />
        <Edges threshold={20} color="#93c5fd" />
      </mesh>

      {/* Cadenas */}
      <group position={[0, -0.12, 0.36]}>
        <RoundedBox args={[0.78, 0.62, 0.22]} radius={0.08} smoothness={4}>
          <meshStandardMaterial color="#e0f2fe" emissive="#22d3ee" emissiveIntensity={0.9} metalness={0.3} roughness={0.2} />
        </RoundedBox>
        <mesh position={[0, 0.34, 0]}>
          <torusGeometry args={[0.24, 0.06, 16, 48, Math.PI]} />
          <meshStandardMaterial color="#e0f2fe" emissive="#22d3ee" emissiveIntensity={0.9} metalness={0.5} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.02, 0.115]}>
          <circleGeometry args={[0.07, 24]} />
          <meshBasicMaterial color="#0b1d4a" />
        </mesh>
      </group>
    </group>
  );
}

/** Points répartis uniformément sur une sphère (spirale de Fibonacci). */
function ParticleGlobe({ count = 1400, radius = 2.6 }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      // Pseudo-aléatoire déterministe : même nuage à chaque rendu.
      const noise = ((i * 9301 + 49297) % 233280) / 233280;
      const jitter = radius * (0.96 + noise * 0.08);
      array.set([Math.cos(theta) * r * jitter, y * jitter, Math.sin(theta) * r * jitter], i * 3);
    }
    return array;
  }, [count, radius]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.08;
    ref.current.rotation.x += delta * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#60a5fa"
        transparent
        opacity={0.75}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function ScanRings() {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (a.current) a.current.rotation.z += delta * 0.5;
    if (b.current) b.current.rotation.z -= delta * 0.35;
  });

  return (
    <>
      <mesh ref={a} rotation={[Math.PI / 2.3, 0.2, 0]}>
        <torusGeometry args={[2.95, 0.012, 8, 160, Math.PI * 1.4]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} />
      </mesh>
      <mesh ref={b} rotation={[Math.PI / 1.7, -0.3, 0]}>
        <torusGeometry args={[3.2, 0.01, 8, 160, Math.PI * 1.1]} />
        <meshBasicMaterial color="#8b5cf6" toneMapped={false} />
      </mesh>
    </>
  );
}

export default function ShieldScene() {
  const rig = useRef<THREE.Group>(null);

  useFrame(({ pointer }, delta) => {
    if (!rig.current) return;
    const k = 1 - Math.exp(-delta * 2.5);
    rig.current.rotation.y += (pointer.x * 0.5 - rig.current.rotation.y) * k;
    rig.current.rotation.x += (-pointer.y * 0.25 - rig.current.rotation.x) * k;
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 4]} intensity={50} color="#22d3ee" />
      <pointLight position={[-4, -2, 3]} intensity={40} color="#8b5cf6" />
      <directionalLight position={[0, 2, 5]} intensity={1} />

      <group ref={rig}>
        <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.5}>
          <Shield />
        </Float>
        <ParticleGlobe />
        <ScanRings />
      </group>
    </>
  );
}
