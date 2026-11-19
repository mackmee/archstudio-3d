export type MaterialCategory = 'wallpaper' | 'paint' | 'flooring' | 'ceiling';

export type PatternType =
  | 'stripes'
  | 'damask'
  | 'brick'
  | 'wood_planks'
  | 'herringbone'
  | 'marble_tile'
  | 'ceramic_tile'
  | 'plaster'
  | 'acoustic_slats'
  | 'solid';

export interface MaterialItem {
  id: string;
  name: string;
  category: MaterialCategory;
  type: 'solid' | 'procedural';
  color: string;
  secondaryColor?: string;
  pattern?: PatternType;
  roughness: number; // 0 to 1
  metalness: number; // 0 to 1
  tileSizeMeters: number; // Real-world size of one tile/repeat unit (meters)
  pricePerUnit: number; // in USD
  unit: 'roll' | 'liter' | 'sqm';
  description?: string;
}

export const MATERIALS_CATALOG: MaterialItem[] = [
  // ==========================================
  // WALLPAPERS (6 Items)
  // ==========================================
  {
    id: 'wp_linen_beige',
    name: 'Warm Beige Linen',
    category: 'wallpaper',
    type: 'procedural',
    color: '#e5ded1',
    secondaryColor: '#d6cdbd',
    pattern: 'plaster',
    roughness: 0.85,
    metalness: 0.0,
    tileSizeMeters: 0.6,
    pricePerUnit: 34.0,
    unit: 'roll',
    description: 'Textured woven linen wallpaper with natural organic fibers.',
  },
  {
    id: 'wp_vertical_stripes',
    name: 'Modern Nordic Stripes',
    category: 'wallpaper',
    type: 'procedural',
    color: '#f4f4f5',
    secondaryColor: '#94a3b8',
    pattern: 'stripes',
    roughness: 0.7,
    metalness: 0.02,
    tileSizeMeters: 0.5,
    pricePerUnit: 42.0,
    unit: 'roll',
    description: 'Clean Scandinavian vertical pin-stripes that heighten ceilings.',
  },
  {
    id: 'wp_sage_botanical',
    name: 'Sage Botanical Damask',
    category: 'wallpaper',
    type: 'procedural',
    color: '#ccd5ae',
    secondaryColor: '#a3b18a',
    pattern: 'damask',
    roughness: 0.75,
    metalness: 0.05,
    tileSizeMeters: 0.6,
    pricePerUnit: 48.0,
    unit: 'roll',
    description: 'Subtle sage-leaf damask pattern with gentle luster.',
  },
  {
    id: 'wp_exposed_brick',
    name: 'Loft Exposed Brick',
    category: 'wallpaper',
    type: 'procedural',
    color: '#9a3412',
    secondaryColor: '#cbd5e1',
    pattern: 'brick',
    roughness: 0.9,
    metalness: 0.0,
    tileSizeMeters: 0.8,
    pricePerUnit: 38.0,
    unit: 'roll',
    description: 'Rustic urban brickwork with realistic mortar joints.',
  },
  {
    id: 'wp_venetian_plaster',
    name: 'Venetian Plaster Grey',
    category: 'wallpaper',
    type: 'procedural',
    color: '#cbd5e1',
    secondaryColor: '#94a3b8',
    pattern: 'plaster',
    roughness: 0.45,
    metalness: 0.08,
    tileSizeMeters: 1.0,
    pricePerUnit: 52.0,
    unit: 'roll',
    description: 'Hand-troweled Italian stucco with soft mineral depth.',
  },
  {
    id: 'wp_acoustic_slats',
    name: 'Wood Acoustic Slats',
    category: 'wallpaper',
    type: 'procedural',
    color: '#b45309',
    secondaryColor: '#0f172a',
    pattern: 'acoustic_slats',
    roughness: 0.65,
    metalness: 0.0,
    tileSizeMeters: 0.6,
    pricePerUnit: 65.0,
    unit: 'roll',
    description: 'Contemporary vertical acoustic oak slats over black acoustic felt.',
  },

  // ==========================================
  // WALL PAINTS (6 Items)
  // ==========================================
  {
    id: 'paint_pure_white',
    name: 'Chantilly Pure White',
    category: 'paint',
    type: 'solid',
    color: '#f8fafc',
    roughness: 0.8,
    metalness: 0.0,
    tileSizeMeters: 1.0,
    pricePerUnit: 18.0,
    unit: 'liter',
    description: 'Crisp, high-reflectance pure white with ultra-matte finish.',
  },
  {
    id: 'paint_warm_greige',
    name: 'Warm Architectural Greige',
    category: 'paint',
    type: 'solid',
    color: '#e2dcd5',
    roughness: 0.82,
    metalness: 0.0,
    tileSizeMeters: 1.0,
    pricePerUnit: 22.0,
    unit: 'liter',
    description: 'Timeless blend of grey and beige creating cozy interior warmth.',
  },
  {
    id: 'paint_soft_sage',
    name: 'Muted Eucalyptus Sage',
    category: 'paint',
    type: 'solid',
    color: '#b7c4b0',
    roughness: 0.8,
    metalness: 0.0,
    tileSizeMeters: 1.0,
    pricePerUnit: 24.0,
    unit: 'liter',
    description: 'Calming botanical green with earthy undertones.',
  },
  {
    id: 'paint_terracotta',
    name: 'Desert Terracotta',
    category: 'paint',
    type: 'solid',
    color: '#c27156',
    roughness: 0.78,
    metalness: 0.0,
    tileSizeMeters: 1.0,
    pricePerUnit: 26.0,
    unit: 'liter',
    description: 'Sun-baked Mediterranean clay tone for accent walls.',
  },
  {
    id: 'paint_midnight_navy',
    name: 'Midnight Oxford Navy',
    category: 'paint',
    type: 'solid',
    color: '#1e293b',
    roughness: 0.7,
    metalness: 0.02,
    tileSizeMeters: 1.0,
    pricePerUnit: 28.0,
    unit: 'liter',
    description: 'Deep, dramatic navy blue with velvety light absorption.',
  },
  {
    id: 'paint_charcoal_matte',
    name: 'Studio Charcoal Matte',
    category: 'paint',
    type: 'solid',
    color: '#334155',
    roughness: 0.85,
    metalness: 0.0,
    tileSizeMeters: 1.0,
    pricePerUnit: 25.0,
    unit: 'liter',
    description: 'Modern architectural graphite for bold statements.',
  },

  // ==========================================
  // FLOORINGS (6 Items)
  // ==========================================
  {
    id: 'floor_natural_oak',
    name: 'Natural Scandinavian Oak',
    category: 'flooring',
    type: 'procedural',
    color: '#d4b996',
    secondaryColor: '#c2a177',
    pattern: 'wood_planks',
    roughness: 0.55,
    metalness: 0.05,
    tileSizeMeters: 1.2,
    pricePerUnit: 38.0,
    unit: 'sqm',
    description: 'Engineered wide-plank oak with brushed satin sheen.',
  },
  {
    id: 'floor_walnut_herringbone',
    name: 'Smoked Walnut Herringbone',
    category: 'flooring',
    type: 'procedural',
    color: '#5c4033',
    secondaryColor: '#4a3228',
    pattern: 'herringbone',
    roughness: 0.5,
    metalness: 0.08,
    tileSizeMeters: 0.8,
    pricePerUnit: 62.0,
    unit: 'sqm',
    description: 'Parisian herringbone parquet in rich smoked walnut.',
  },
  {
    id: 'floor_carrara_marble',
    name: 'Carrara Polished Marble',
    category: 'flooring',
    type: 'procedural',
    color: '#f8fafc',
    secondaryColor: '#64748b',
    pattern: 'marble_tile',
    roughness: 0.15,
    metalness: 0.1,
    tileSizeMeters: 1.0,
    pricePerUnit: 78.0,
    unit: 'sqm',
    description: 'Large-format Italian white marble with soft grey veining.',
  },
  {
    id: 'floor_warm_travertine',
    name: 'Honed Roman Travertine',
    category: 'flooring',
    type: 'procedural',
    color: '#e6ded1',
    secondaryColor: '#cfc4b2',
    pattern: 'ceramic_tile',
    roughness: 0.65,
    metalness: 0.02,
    tileSizeMeters: 0.8,
    pricePerUnit: 48.0,
    unit: 'sqm',
    description: 'Textured natural limestone with honed matte surface.',
  },
  {
    id: 'floor_light_concrete',
    name: 'Architectural Polished Concrete',
    category: 'flooring',
    type: 'procedural',
    color: '#94a3b8',
    secondaryColor: '#64748b',
    pattern: 'plaster',
    roughness: 0.4,
    metalness: 0.08,
    tileSizeMeters: 1.5,
    pricePerUnit: 32.0,
    unit: 'sqm',
    description: 'Seamless micro-cement screed with subtle aggregate speckling.',
  },
  {
    id: 'floor_slate_tile',
    name: 'Anthracite Slate Tile',
    category: 'flooring',
    type: 'procedural',
    color: '#1e293b',
    secondaryColor: '#0f172a',
    pattern: 'ceramic_tile',
    roughness: 0.7,
    metalness: 0.04,
    tileSizeMeters: 0.6,
    pricePerUnit: 44.0,
    unit: 'sqm',
    description: 'Cleft-face natural slate with dark charcoal grout joints.',
  },

  // ==========================================
  // CEILING FINISHES (4 Items)
  // ==========================================
  {
    id: 'ceil_matte_white',
    name: 'Matte White Gypsum',
    category: 'ceiling',
    type: 'solid',
    color: '#ffffff',
    roughness: 0.95,
    metalness: 0.0,
    tileSizeMeters: 1.0,
    pricePerUnit: 14.0,
    unit: 'sqm',
    description: 'Smooth seamless drywall with anti-glare flat white coating.',
  },
  {
    id: 'ceil_warm_cream',
    name: 'Warm Alabaster Cream',
    category: 'ceiling',
    type: 'solid',
    color: '#fef3c7',
    roughness: 0.9,
    metalness: 0.0,
    tileSizeMeters: 1.0,
    pricePerUnit: 16.0,
    unit: 'sqm',
    description: 'Soft candlelight cream ceiling reducing contrast glare.',
  },
  {
    id: 'ceil_acoustic_wood',
    name: 'Natural Birch Acoustic Panel',
    category: 'ceiling',
    type: 'procedural',
    color: '#e2cfb4',
    secondaryColor: '#334155',
    pattern: 'acoustic_slats',
    roughness: 0.6,
    metalness: 0.0,
    tileSizeMeters: 0.6,
    pricePerUnit: 58.0,
    unit: 'sqm',
    description: 'Linear timber ceiling panels with integrated sound dampening.',
  },
  {
    id: 'ceil_recessed_concrete',
    name: 'Raw Board-Formed Concrete',
    category: 'ceiling',
    type: 'procedural',
    color: '#cbd5e1',
    secondaryColor: '#94a3b8',
    pattern: 'wood_planks',
    roughness: 0.75,
    metalness: 0.05,
    tileSizeMeters: 1.2,
    pricePerUnit: 28.0,
    unit: 'sqm',
    description: 'Industrial architectural ceiling with authentic wood grain form marks.',
  },
];

export const DEFAULT_WALL_MATERIAL_ID = 'paint_pure_white';
export const DEFAULT_FLOOR_MATERIAL_ID = 'floor_natural_oak';
export const DEFAULT_CEILING_MATERIAL_ID = 'ceil_matte_white';

export function getMaterialById(id?: string): MaterialItem {
  if (!id) return MATERIALS_CATALOG[0];
  const found = MATERIALS_CATALOG.find((m) => m.id === id);
  return found || MATERIALS_CATALOG[0];
}

export function getMaterialsByCategory(category: MaterialCategory): MaterialItem[] {
  return MATERIALS_CATALOG.filter((m) => m.category === category);
}
