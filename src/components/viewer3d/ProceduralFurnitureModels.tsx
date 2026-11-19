'use client';

import React from 'react';
import { ProceduralModelType } from '@/data/furniture';

interface ModelProps {
  modelType: ProceduralModelType;
  color?: string;
}

export const ProceduralFurnitureModel: React.FC<ModelProps> = ({ modelType, color }) => {
  const primaryColor = color || '#475569';

  switch (modelType) {
    case 'sofa_3seater':
      return <Sofa3Seater color={primaryColor} />;
    case 'coffee_table':
      return <CoffeeTable color={primaryColor} />;
    case 'tv_console':
      return <TvConsole color={primaryColor} />;
    case 'armchair':
      return <Armchair color={primaryColor} />;
    case 'bed_queen':
      return <QueenBed color={primaryColor} />;
    case 'nightstand':
      return <Nightstand color={primaryColor} />;
    case 'wardrobe':
      return <Wardrobe color={primaryColor} />;
    case 'dining_set':
      return <DiningSet color={primaryColor} />;
    case 'kitchen_island':
      return <KitchenIsland color={primaryColor} />;
    case 'curtains_pleated':
      return <CurtainsPleated color={primaryColor} />;
    case 'floor_lamp':
      return <FloorLamp color={primaryColor} />;
    case 'potted_plant':
      return <PottedPlant color={primaryColor} />;
    default:
      return (
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color={primaryColor} roughness={0.6} />
        </mesh>
      );
  }
};

// 1. Sofa 3-Seater
const Sofa3Seater: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Base Seat Frame */}
    <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.2, 0.24, 0.95]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>

    {/* 3 Seat Cushions */}
    {[-0.68, 0, 0.68].map((x, i) => (
      <mesh key={i} position={[x, 0.42, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.66, 0.16, 0.8]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
    ))}

    {/* Backrest Cushion */}
    <mesh position={[0, 0.62, -0.36]} castShadow receiveShadow>
      <boxGeometry args={[2.2, 0.52, 0.22]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>

    {/* Left Armrest */}
    <mesh position={[-1.02, 0.48, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.18, 0.36, 0.95]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>

    {/* Right Armrest */}
    <mesh position={[1.02, 0.48, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.18, 0.36, 0.95]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>

    {/* 4 Wooden Tapered Legs */}
    {[
      [-0.98, -0.4],
      [0.98, -0.4],
      [-0.98, 0.4],
      [0.98, 0.4],
    ].map(([lx, lz], i) => (
      <mesh key={i} position={[lx, 0.05, lz]} castShadow>
        <cylinderGeometry args={[0.02, 0.03, 0.1, 12]} />
        <meshStandardMaterial color="#3b250c" roughness={0.5} />
      </mesh>
    ))}
  </group>
);

// 2. Coffee Table
const CoffeeTable: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Table Top */}
    <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.1, 0.04, 0.6]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>

    {/* Lower Shelf */}
    <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.95, 0.02, 0.48]} />
      <meshStandardMaterial color="#1e293b" roughness={0.6} />
    </mesh>

    {/* 4 Metal Legs */}
    {[
      [-0.48, -0.24],
      [0.48, -0.24],
      [-0.48, 0.24],
      [0.48, 0.24],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.2, z]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.4, 12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
      </mesh>
    ))}
  </group>
);

// 3. Media Console & 65" TV
const TvConsole: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Credenza Body */}
    <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.0, 0.45, 0.45]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>

    {/* 4 Low Legs */}
    {[
      [-0.9, -0.16],
      [0.9, -0.16],
      [-0.9, 0.16],
      [0.9, 0.16],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.03, z]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.06, 12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
    ))}

    {/* TV Stand Base */}
    <mesh position={[0, 0.52, 0]} castShadow>
      <boxGeometry args={[0.5, 0.015, 0.25]} />
      <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
    </mesh>

    {/* TV Screen (65") */}
    <mesh position={[0, 0.95, 0]} castShadow>
      <boxGeometry args={[1.45, 0.82, 0.03]} />
      <meshStandardMaterial color="#090d16" roughness={0.1} metalness={0.2} />
    </mesh>

    {/* Glass Screen Reflection */}
    <mesh position={[0, 0.95, 0.018]}>
      <planeGeometry args={[1.42, 0.79]} />
      <meshStandardMaterial color="#020617" roughness={0.05} metalness={0.3} />
    </mesh>
  </group>
);

// 4. Lounge Armchair
const Armchair: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Seat Cushion */}
    <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.7, 0.2, 0.75]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>

    {/* Angled Backrest */}
    <mesh position={[0, 0.65, -0.28]} rotation={[-0.1, 0, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.7, 0.45, 0.15]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>

    {/* Side Armrests */}
    <mesh position={[-0.38, 0.46, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.12, 0.28, 0.75]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
    <mesh position={[0.38, 0.46, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.12, 0.28, 0.75]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>

    {/* 4 Wooden Legs */}
    {[
      [-0.3, -0.28],
      [0.3, -0.28],
      [-0.3, 0.28],
      [0.3, 0.28],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.14, z]} castShadow>
        <cylinderGeometry args={[0.02, 0.03, 0.28, 12]} />
        <meshStandardMaterial color="#451a03" roughness={0.5} />
      </mesh>
    ))}
  </group>
);

// 5. Queen Bed with Headboard & Pillows
const QueenBed: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Bed Base Frame */}
    <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.7, 0.26, 2.1]} />
      <meshStandardMaterial color="#334155" roughness={0.6} />
    </mesh>

    {/* Mattress */}
    <mesh position={[0, 0.38, 0.05]} castShadow receiveShadow>
      <boxGeometry args={[1.6, 0.22, 1.95]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>

    {/* Duvet / Blanket */}
    <mesh position={[0, 0.42, 0.3]} castShadow receiveShadow>
      <boxGeometry args={[1.62, 0.15, 1.4]} />
      <meshStandardMaterial color="#cbd5e1" roughness={0.75} />
    </mesh>

    {/* Headboard */}
    <mesh position={[0, 0.75, -0.98]} castShadow receiveShadow>
      <boxGeometry args={[1.75, 0.9, 0.14]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>

    {/* Pillows */}
    <mesh position={[-0.42, 0.52, -0.65]} rotation={[0.2, 0, 0]} castShadow>
      <boxGeometry args={[0.55, 0.12, 0.38]} />
      <meshStandardMaterial color="#ffffff" roughness={0.8} />
    </mesh>
    <mesh position={[0.42, 0.52, -0.65]} rotation={[0.2, 0, 0]} castShadow>
      <boxGeometry args={[0.55, 0.12, 0.38]} />
      <meshStandardMaterial color="#ffffff" roughness={0.8} />
    </mesh>
  </group>
);

// 6. Nightstand
const Nightstand: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Body */}
    <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.5, 0.5, 0.4]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>

    {/* Drawer Handles */}
    <mesh position={[0, 0.35, 0.21]} castShadow>
      <boxGeometry args={[0.14, 0.015, 0.015]} />
      <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
    </mesh>
    <mesh position={[0, 0.18, 0.21]} castShadow>
      <boxGeometry args={[0.14, 0.015, 0.015]} />
      <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
    </mesh>

    {/* Lamp on Nightstand */}
    <mesh position={[0, 0.56, 0]} castShadow>
      <cylinderGeometry args={[0.04, 0.06, 0.12, 16]} />
      <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, 0.68, 0]} castShadow>
      <cylinderGeometry args={[0.09, 0.12, 0.16, 16]} />
      <meshStandardMaterial color="#fef3c7" roughness={0.3} />
    </mesh>
  </group>
);

// 7. Wardrobe Closet
const Wardrobe: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Closet Body */}
    <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.8, 2.3, 0.6]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>

    {/* 3 Vertical Handles */}
    {[-0.55, 0, 0.55].map((x, i) => (
      <mesh key={i} position={[x + 0.22, 1.15, 0.31]} castShadow>
        <boxGeometry args={[0.02, 0.6, 0.02]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
    ))}
  </group>
);

// 8. Dining Table & 4 Chairs Set
const DiningSet: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Dining Table Top */}
    <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.6, 0.05, 0.95]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>

    {/* 4 Table Legs */}
    {[
      [-0.72, -0.4],
      [0.72, -0.4],
      [-0.72, 0.4],
      [0.72, 0.4],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.36, z]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.72, 12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
    ))}

    {/* 4 Chairs (2 on each long side) */}
    {[
      [-0.45, -0.65, 0],
      [0.45, -0.65, 0],
      [-0.45, 0.65, Math.PI],
      [0.45, 0.65, Math.PI],
    ].map(([cx, cz, rotY], i) => (
      <group key={i} position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
        {/* Chair Seat */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.42, 0.04, 0.42]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
        {/* Chair Backrest */}
        <mesh position={[0, 0.7, -0.19]} castShadow>
          <boxGeometry args={[0.4, 0.45, 0.03]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
        {/* 4 Chair Legs */}
        {[
          [-0.18, -0.18],
          [0.18, -0.18],
          [-0.18, 0.18],
          [0.18, 0.18],
        ].map(([lx, lz], j) => (
          <mesh key={j} position={[lx, 0.22, lz]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.44, 8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
        ))}
      </group>
    ))}
  </group>
);

// 9. Kitchen Island Cabinet
const KitchenIsland: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Base Cabinet */}
    <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.7, 0.88, 0.75]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>

    {/* Overhanging Quartz Countertop */}
    <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.8, 0.05, 0.82]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
    </mesh>
  </group>
);

// 10. Floor-to-Ceiling Curtains with Mounting Rod
const CurtainsPleated: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Brass Top Curtain Rod */}
    <mesh position={[0, 2.58, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.015, 0.015, 1.9, 16]} />
      <meshStandardMaterial color="#eab308" metalness={0.85} roughness={0.25} />
    </mesh>

    {/* Left Curtain Panel (Pleated folds) */}
    {[-0.8, -0.72, -0.64, -0.56].map((x, i) => (
      <mesh key={`left-${i}`} position={[x, 1.3, (i % 2) * 0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 2.55, 0.04]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    ))}

    {/* Right Curtain Panel (Pleated folds) */}
    {[0.56, 0.64, 0.72, 0.8].map((x, i) => (
      <mesh key={`right-${i}`} position={[x, 1.3, (i % 2) * 0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 2.55, 0.04]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    ))}
  </group>
);

// 11. Arc Floor Lamp
const FloorLamp: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Marble Base */}
    <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.18, 0.18, 0.06, 24]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
    </mesh>

    {/* Slender Vertical Stem */}
    <mesh position={[0, 0.85, 0]} castShadow>
      <cylinderGeometry args={[0.012, 0.012, 1.6, 12]} />
      <meshStandardMaterial color={color} metalness={0.85} roughness={0.25} />
    </mesh>

    {/* Horizontal Overhanging Arm */}
    <mesh position={[0.2, 1.68, 0]} rotation={[0, 0, -0.2]} castShadow>
      <boxGeometry args={[0.42, 0.015, 0.015]} />
      <meshStandardMaterial color={color} metalness={0.85} roughness={0.25} />
    </mesh>

    {/* Dome Shade */}
    <mesh position={[0.38, 1.55, 0]} castShadow>
      <sphereGeometry args={[0.12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.3} side={2} />
    </mesh>
  </group>
);

// 12. Potted Plant (Monstera in Terracotta Ceramic Pot)
const PottedPlant: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Fluted Ceramic Pot */}
    <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.2, 0.15, 0.44, 20]} />
      <meshStandardMaterial color="#c27156" roughness={0.7} />
    </mesh>

    {/* Dark Potting Soil */}
    <mesh position={[0, 0.43, 0]}>
      <cylinderGeometry args={[0.19, 0.19, 0.02, 16]} />
      <meshStandardMaterial color="#1c1917" roughness={0.9} />
    </mesh>

    {/* Monstera Leaves (Curved angled green planes/fans) */}
    {[
      [0.15, 0.65, 0, 0.4, 0.3],
      [-0.15, 0.72, 0.1, -0.5, 0.2],
      [0.05, 0.8, -0.15, 0.2, -0.4],
      [-0.1, 0.9, -0.05, -0.3, -0.2],
      [0, 1.0, 0.05, 0.1, 0.1],
    ].map(([lx, ly, lz, rx, rz], i) => (
      <mesh
        key={i}
        position={[lx, ly, lz]}
        rotation={[rx, (i * Math.PI) / 2.5, rz]}
        castShadow
      >
        <boxGeometry args={[0.25, 0.005, 0.32]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
    ))}
  </group>
);
