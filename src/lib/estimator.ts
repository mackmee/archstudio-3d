import { Wall, Opening, PlacedFurniture } from '@/types/floorplan';
import { getMaterialById, DEFAULT_WALL_MATERIAL_ID } from '@/data/materials';
import { getFurnitureCatalogItem } from '@/data/furniture';
import { distance } from './geometry';

export interface WallFinishLineItem {
  materialId: string;
  materialName: string;
  category: 'wallpaper' | 'paint';
  unit: 'roll' | 'liter';
  netArea: number; // in m²
  reserveArea: number; // in m² with wasteFactor
  requiredUnits: number; // rolls or liters (ceiling rounded)
  unitPrice: number; // in USD
  totalPrice: number; // in USD
  swatchColor: string;
  pattern?: string;
}

export interface SurfaceFinishLineItem {
  type: 'flooring' | 'ceiling';
  materialId: string;
  materialName: string;
  unit: 'sqm';
  netArea: number; // in m²
  reserveArea: number; // in m² with wasteFactor
  unitPrice: number; // in USD
  totalPrice: number; // in USD
  swatchColor: string;
}

export interface FurnitureLineItem {
  catalogId: string;
  name: string;
  category: string;
  quantity: number;
  dimensions: { width: number; height: number; depth: number };
  unitPrice: number; // in USD
  totalPrice: number; // in USD
  color?: string;
}

export interface WallAuditItem {
  wallId: string;
  length: number; // in meters
  grossArea: number; // in m² (length * ceilingHeight)
  openingsArea: number; // in m² subtracted
  netArea: number; // in m² (gross - openings)
  materialLeftName: string;
  materialRightName: string;
}

export interface EstimateSummary {
  totalFloorArea: number;
  totalCeilingArea: number;
  totalGrossWallArea: number;
  totalOpeningsArea: number;
  totalNetWallArea: number;
  wallFinishItems: WallFinishLineItem[];
  surfaceFinishItems: SurfaceFinishLineItem[];
  furnitureItems: FurnitureLineItem[];
  wallAuditItems: WallAuditItem[];
  finishingMaterialsSubtotal: number;
  furnitureSubtotal: number;
  laborCost: number;
  deliveryCost: number;
  grandTotal: number;
  wasteFactor: number;
}

export interface EstimateOptions {
  walls: Wall[];
  openings: Opening[];
  ceilingHeight: number;
  floorMaterialId: string;
  ceilingMaterialId: string;
  furniture: PlacedFurniture[];
  wasteFactor?: number; // default 0.10 (10%)
  includeLabor?: boolean; // default true
  laborRatePerSqm?: number; // default 25 $/m²
  customMaterialPrices?: Record<string, number>;
  customFurniturePrices?: Record<string, number>;
}

/**
 * Standard Construction Coverage Constants:
 * - Wallpaper: 10.6 m² per standard European architectural roll (1.06m × 10m)
 * - Paint: 5.0 m² per liter (standard 2-coat application: 10 m²/L single coat ÷ 2 coats)
 */
export const WALLPAPER_SQM_PER_ROLL = 10.6;
export const PAINT_SQM_PER_LITER = 5.0;
export const BASE_DELIVERY_FEE = 150;

/**
 * Pure calculation engine to derive full Bill of Materials (BOM)
 */
export function computeFloorplanEstimate(options: EstimateOptions): EstimateSummary {
  const {
    walls,
    openings,
    ceilingHeight,
    floorMaterialId,
    ceilingMaterialId,
    furniture,
    wasteFactor = 0.1,
    includeLabor = true,
    laborRatePerSqm = 25,
    customMaterialPrices = {},
    customFurniturePrices = {},
  } = options;

  let totalGrossWallArea = 0;
  let totalOpeningsArea = 0;
  let totalNetWallArea = 0;

  // Map to accumulate net area per material ID (accounting for both Side A and Side B)
  const wallMaterialAreaMap: Record<string, number> = {};
  const wallAuditItems: WallAuditItem[] = [];

  walls.forEach((wall) => {
    const wallLen = distance(wall.start, wall.end);
    const grossFaceArea = wallLen * ceilingHeight;

    // Subtracted opening area on this wall
    const wallOpenings = openings.filter((o) => o.wallId === wall.id);
    const openingsArea = wallOpenings.reduce(
      (sum, op) => sum + op.width * op.height,
      0
    );
    const netFaceArea = Math.max(0, grossFaceArea - openingsArea);

    totalGrossWallArea += grossFaceArea * 2; // two sides
    totalOpeningsArea += openingsArea * 2;   // cutouts pierce both sides
    totalNetWallArea += netFaceArea * 2;

    // Track Side A (Left)
    const matLeftId = wall.materialLeftId || DEFAULT_WALL_MATERIAL_ID;
    wallMaterialAreaMap[matLeftId] = (wallMaterialAreaMap[matLeftId] || 0) + netFaceArea;

    // Track Side B (Right)
    const matRightId = wall.materialRightId || DEFAULT_WALL_MATERIAL_ID;
    wallMaterialAreaMap[matRightId] = (wallMaterialAreaMap[matRightId] || 0) + netFaceArea;

    wallAuditItems.push({
      wallId: wall.id,
      length: wallLen,
      grossArea: grossFaceArea,
      openingsArea: openingsArea,
      netArea: netFaceArea,
      materialLeftName: getMaterialById(matLeftId).name,
      materialRightName: getMaterialById(matRightId).name,
    });
  });

  // Calculate Wall Finish Line Items (Wallpapers & Paints)
  const wallFinishItems: WallFinishLineItem[] = Object.entries(wallMaterialAreaMap).map(
    ([matId, netArea]) => {
      const mat = getMaterialById(matId);
      const isWallpaper = mat.category === 'wallpaper';
      const reserveArea = netArea * (1 + wasteFactor);

      // Unit Calculation:
      let requiredUnits = 0;
      if (isWallpaper) {
        requiredUnits = Math.ceil(reserveArea / WALLPAPER_SQM_PER_ROLL);
      } else {
        requiredUnits = Math.ceil(reserveArea / PAINT_SQM_PER_LITER);
      }
      requiredUnits = Math.max(1, requiredUnits);

      const effectiveUnitPrice =
        customMaterialPrices[matId] !== undefined
          ? customMaterialPrices[matId]
          : mat.pricePerUnit;

      const totalPrice = requiredUnits * effectiveUnitPrice;

      return {
        materialId: matId,
        materialName: mat.name,
        category: isWallpaper ? 'wallpaper' : 'paint',
        unit: isWallpaper ? 'roll' : 'liter',
        netArea,
        reserveArea,
        requiredUnits,
        unitPrice: effectiveUnitPrice,
        totalPrice,
        swatchColor: mat.color,
        pattern: mat.pattern,
      };
    }
  );

  // Compute Floor & Ceiling footprint area in m²
  let floorArea = 0;
  if (walls.length > 0) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    walls.forEach((w) => {
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minZ = Math.min(minZ, w.start.y, w.end.y);
      maxZ = Math.max(maxZ, w.start.y, w.end.y);
    });
    // Internal floor area estimate inside perimeter walls
    floorArea = Math.max(0, (maxX - minX) * (maxZ - minZ) * 0.75);
  }

  // Surface Finishes (Flooring & Ceiling)
  const floorMat = getMaterialById(floorMaterialId);
  const ceilMat = getMaterialById(ceilingMaterialId);

  const floorReserveArea = Math.ceil(floorArea * (1 + wasteFactor));
  const ceilReserveArea = Math.ceil(floorArea * (1 + wasteFactor));

  const floorUnitPrice =
    customMaterialPrices[floorMaterialId] !== undefined
      ? customMaterialPrices[floorMaterialId]
      : floorMat.pricePerUnit;

  const ceilUnitPrice =
    customMaterialPrices[ceilingMaterialId] !== undefined
      ? customMaterialPrices[ceilingMaterialId]
      : ceilMat.pricePerUnit;

  const surfaceFinishItems: SurfaceFinishLineItem[] = [
    {
      type: 'flooring',
      materialId: floorMaterialId,
      materialName: floorMat.name,
      unit: 'sqm',
      netArea: floorArea,
      reserveArea: floorReserveArea,
      unitPrice: floorUnitPrice,
      totalPrice: floorReserveArea * floorUnitPrice,
      swatchColor: floorMat.color,
    },
    {
      type: 'ceiling',
      materialId: ceilingMaterialId,
      materialName: ceilMat.name,
      unit: 'sqm',
      netArea: floorArea,
      reserveArea: ceilReserveArea,
      unitPrice: ceilUnitPrice,
      totalPrice: ceilReserveArea * ceilUnitPrice,
      swatchColor: ceilMat.color,
    },
  ];

  // Furniture Line Items (Grouped by catalogId / name)
  const furnitureMap: Record<string, { item: PlacedFurniture; count: number }> = {};
  furniture.forEach((f) => {
    if (!furnitureMap[f.catalogId]) {
      furnitureMap[f.catalogId] = { item: f, count: 0 };
    }
    furnitureMap[f.catalogId].count += 1;
  });

  const furnitureItems: FurnitureLineItem[] = Object.values(furnitureMap).map(
    ({ item, count }) => {
      const catalogInfo = getFurnitureCatalogItem(item.catalogId);
      const effectiveUnitPrice =
        customFurniturePrices[item.catalogId] !== undefined
          ? customFurniturePrices[item.catalogId]
          : item.price || catalogInfo.price;

      return {
        catalogId: item.catalogId,
        name: item.name || catalogInfo.name,
        category: catalogInfo.category,
        quantity: count,
        dimensions: catalogInfo.dimensions,
        unitPrice: effectiveUnitPrice,
        totalPrice: count * effectiveUnitPrice,
        color: item.color || catalogInfo.defaultColor,
      };
    }
  );

  // Subtotals
  const finishingMaterialsSubtotal =
    wallFinishItems.reduce((sum, item) => sum + item.totalPrice, 0) +
    surfaceFinishItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const furnitureSubtotal = furnitureItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  // Labor & Delivery
  const laborCost = includeLabor ? Math.round(floorArea * laborRatePerSqm) : 0;
  const deliveryCost = includeLabor && furniture.length > 0 ? BASE_DELIVERY_FEE : 0;

  const grandTotal = finishingMaterialsSubtotal + furnitureSubtotal + laborCost + deliveryCost;

  return {
    totalFloorArea: floorArea,
    totalCeilingArea: floorArea,
    totalGrossWallArea,
    totalOpeningsArea,
    totalNetWallArea,
    wallFinishItems,
    surfaceFinishItems,
    furnitureItems,
    wallAuditItems,
    finishingMaterialsSubtotal,
    furnitureSubtotal,
    laborCost,
    deliveryCost,
    grandTotal,
    wasteFactor,
  };
}
