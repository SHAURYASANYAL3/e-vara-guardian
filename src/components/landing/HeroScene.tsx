import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";

const FloatingCluster = ({ pointerX, pointerY }: { pointerX: number; pointerY: number }) => {
  const groupRef = useRef<Group>(null);
  const sphereRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const torusRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    const targetX = pointerY * 0.25;
    const targetY = pointerX * 0.35;

    if (groupRef.current) {
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.05;
      groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.05;
      groupRef.current.position.y = Math.sin(elapsed * 0.7) * 0.08;
    }

    if (sphereRef.current) {
      sphereRef.current.rotation.y += delta * 0.35;
      sphereRef.current.rotation.z = Math.sin(elapsed * 0.6) * 0.18;
    }

    if (ringRef.current) {
      ringRef.current.rotation.x += delta * 0.25;
      ringRef.current.rotation.y -= delta * 0.3;
    }

    if (torusRef.current) {
      torusRef.current.rotation.x -= delta * 0.22;
      torusRef.current.rotation.z += delta * 0.28;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={sphereRef} position={[0, 0, 0]}>
        <icosahedronGeometry args={[1.05, 8]} />
        <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={0.7} metalness={0.4} roughness={0.18} />
      </mesh>

      <mesh ref={ringRef} position={[0, 0, 0]} rotation={[0.7, 0, 0.4]}>
        <torusGeometry args={[1.7, 0.055, 32, 160]} />
        <meshStandardMaterial color="#a78bfa" emissive="#7c3aed" emissiveIntensity={1.15} metalness={0.75} roughness={0.22} />
      </mesh>

      <mesh ref={torusRef} position={[0.45, -0.45, -0.25]} rotation={[1.1, 0.2, 0.8]}>
        <torusKnotGeometry args={[0.42, 0.12, 180, 24]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.95} metalness={0.45} roughness={0.28} />
      </mesh>
    </group>
  );
};

const ParticleField = () => {
  const positions = useMemo(() => {
    const values = new Float32Array(240);
    for (let index = 0; index < values.length; index += 3) {
      values[index] = (Math.random() - 0.5) * 8;
      values[index + 1] = (Math.random() - 0.5) * 5;
      values[index + 2] = (Math.random() - 0.5) * 5;
    }
    return values;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#67e8f9" size={0.03} transparent opacity={0.75} sizeAttenuation />
    </points>
  );
};

interface HeroSceneProps {
  pointerX: number;
  pointerY: number;
}

const HeroScene = ({ pointerX, pointerY }: HeroSceneProps) => {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.6], fov: 42 }} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 4.5, 8]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 3, 3]} intensity={1.1} color="#93c5fd" />
      <pointLight position={[-2.5, 1.5, 2]} intensity={18} color="#22d3ee" distance={8} />
      <pointLight position={[2, -1.5, 2.5]} intensity={14} color="#8b5cf6" distance={8} />
      <FloatingCluster pointerX={pointerX} pointerY={pointerY} />
      <ParticleField />
    </Canvas>
  );
};

export default HeroScene;
