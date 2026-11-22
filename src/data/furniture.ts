export type FurnitureCategory = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'curtains' | 'decor';

export type ProceduralModelType =
  | 'sofa_3seater'
  | 'coffee_table'
  | 'tv_console'
  | 'armchair'
  | 'bed_queen'
  | 'nightstand'
  | 'wardrobe'
  | 'dining_set'
  | 'kitchen_island'
  | 'desk'
  | 'bathtub'
  | 'toilet'
  | 'curtains_pleated'
  | 'floor_lamp'
  | 'potted_plant'
  | 'custom_glb';

export interface FurnitureCatalogItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  dimensions: {
    width: number;  // along X (meters)
    height: number; // along Y (meters)
    depth: number;  // along Z (meters)
  };
  price: number; // in USD
  defaultColor: string; // hex
  modelType: ProceduralModelType;
  description: string;
}

export const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  // ==========================================
  // LIVING ROOM (4 Items)
  // ==========================================
  {
    id: 'furn_sofa_3seater',
    name: 'Modern 3-Seater Sofa',
    category: 'living',
    dimensions: { width: 2.2, height: 0.85, depth: 0.95 },
    price: 850,
    defaultColor: '#475569',
    modelType: 'sofa_3seater',
    description: 'Deep-seat contemporary sofa with upholstered fabric cushions and wooden legs.',
  },
  {
    id: 'furn_coffee_table',
    name: 'Minimalist Coffee Table',
    category: 'living',
    dimensions: { width: 1.1, height: 0.42, depth: 0.6 },
    price: 240,
    defaultColor: '#78350f',
    modelType: 'coffee_table',
    description: 'Solid oak low coffee table with rounded chamfer edges and matte black steel frame.',
  },
  {
    id: 'furn_tv_console',
    name: 'Media Console & 65" TV',
    category: 'living',
    dimensions: { width: 2.0, height: 1.35, depth: 0.45 },
    price: 1100,
    defaultColor: '#1e293b',
    modelType: 'tv_console',
    description: 'Floating low-profile entertainment credenza topped with a slim 65" OLED television.',
  },
  {
    id: 'furn_armchair',
    name: 'Nordic Lounge Armchair',
    category: 'living',
    dimensions: { width: 0.85, height: 0.8, depth: 0.85 },
    price: 390,
    defaultColor: '#d97706',
    modelType: 'armchair',
    description: 'Ergonomic accent lounge chair with mustard velvet upholstery and tapered birch legs.',
  },

  // ==========================================
  // BEDROOM (3 Items)
  // ==========================================
  {
    id: 'furn_bed_queen',
    name: 'Queen Bed with Headboard',
    category: 'bedroom',
    dimensions: { width: 1.7, height: 1.1, depth: 2.1 },
    price: 1250,
    defaultColor: '#f1f5f9',
    modelType: 'bed_queen',
    description: 'Platform queen bed featuring an upholstered headboard, dual pillows, and folded duvet.',
  },
  {
    id: 'furn_nightstand',
    name: 'Floating Bedside Nightstand',
    category: 'bedroom',
    dimensions: { width: 0.5, height: 0.5, depth: 0.4 },
    price: 160,
    defaultColor: '#451a03',
    modelType: 'nightstand',
    description: 'Minimalist dual-drawer nightstand with brass handles and bedside lamp surface.',
  },
  {
    id: 'furn_wardrobe',
    name: 'Modular 3-Door Wardrobe',
    category: 'bedroom',
    dimensions: { width: 1.8, height: 2.3, depth: 0.6 },
    price: 980,
    defaultColor: '#e2e8f0',
    modelType: 'wardrobe',
    description: 'Full-height Scandinavian wardrobe with flush soft-close doors and matte black vertical handles.',
  },
  {
    id: 'furn_desk',
    name: 'Modern Study Desk & Chair',
    category: 'bedroom',
    dimensions: { width: 1.4, height: 0.75, depth: 0.7 },
    price: 450,
    defaultColor: '#334155',
    modelType: 'desk',
    description: 'Contemporary writing and computer desk with oak surface, drawer unit, and ergonomic chair.',
  },

  // ==========================================
  // KITCHEN & DINING (2 Items)
  // ==========================================
  {
    id: 'furn_dining_set',
    name: 'Dining Table & 4 Chairs',
    category: 'kitchen',
    dimensions: { width: 1.6, height: 0.78, depth: 0.95 },
    price: 720,
    defaultColor: '#92400e',
    modelType: 'dining_set',
    description: 'Rectangular hardwood dining table with 4 curved architectural dining chairs.',
  },
  {
    id: 'furn_kitchen_island',
    name: 'Kitchen Island Cabinet',
    category: 'kitchen',
    dimensions: { width: 1.8, height: 0.92, depth: 0.8 },
    price: 1400,
    defaultColor: '#0f172a',
    modelType: 'kitchen_island',
    description: 'Freestanding kitchen island with white quartz waterfall countertop and base drawers.',
  },

  // ==========================================
  // BATHROOM & SANITARY (2 Items)
  // ==========================================
  {
    id: 'furn_bathtub',
    name: 'Freestanding Oval Bathtub',
    category: 'bathroom',
    dimensions: { width: 1.7, height: 0.6, depth: 0.8 },
    price: 890,
    defaultColor: '#f8fafc',
    modelType: 'bathtub',
    description: 'Seamless white acrylic freestanding soaking tub with chrome floor-mounted mixer.',
  },
  {
    id: 'furn_toilet',
    name: 'Wall-Hung Modern Toilet',
    category: 'bathroom',
    dimensions: { width: 0.42, height: 0.5, depth: 0.6 },
    price: 320,
    defaultColor: '#ffffff',
    modelType: 'toilet',
    description: 'Compact rimless wall-mounted toilet bowl with concealed in-wall cistern push plate.',
  },

  // ==========================================
  // CURTAINS & DECOR (3 Items)
  // ==========================================
  {
    id: 'furn_curtains_pleated',
    name: 'Floor-to-Ceiling Curtains',
    category: 'curtains',
    dimensions: { width: 1.8, height: 2.6, depth: 0.15 },
    price: 280,
    defaultColor: '#fef3c7',
    modelType: 'curtains_pleated',
    description: 'Luxury floor-length pinch-pleat linen window drapes mounted on a satin brass ceiling rod.',
  },
  {
    id: 'furn_floor_lamp',
    name: 'Arc Floor Lamp',
    category: 'decor',
    dimensions: { width: 0.5, height: 1.75, depth: 0.5 },
    price: 195,
    defaultColor: '#cbd5e1',
    modelType: 'floor_lamp',
    description: 'Modern slender arch floor lamp with weighted marble base and warm dome diffuser.',
  },
  {
    id: 'furn_potted_plant',
    name: 'Monstera in Ceramic Pot',
    category: 'decor',
    dimensions: { width: 0.6, height: 1.1, depth: 0.6 },
    price: 85,
    defaultColor: '#15803d',
    modelType: 'potted_plant',
    description: 'Lush indoor tropical Monstera Deliciosa plant in a fluted terracotta ceramic pot.',
  },
];

export function getFurnitureCatalogItem(catalogId: string): FurnitureCatalogItem {
  const found = FURNITURE_CATALOG.find((item) => item.id === catalogId);
  return (
    found || {
      id: catalogId,
      name: 'Custom 3D Model',
      category: 'decor',
      dimensions: { width: 1.0, height: 1.0, depth: 1.0 },
      price: 100,
      defaultColor: '#64748b',
      modelType: 'custom_glb',
      description: 'Custom imported 3D asset.',
    }
  );
}

export function getFurnitureByCategory(category: FurnitureCategory | 'all'): FurnitureCatalogItem[] {
  if (category === 'all') return FURNITURE_CATALOG;
  return FURNITURE_CATALOG.filter((item) => item.category === category);
}
