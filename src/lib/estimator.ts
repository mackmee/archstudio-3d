import { Wall, Opening, PlacedFurniture, Room, MarketPresetType } from '@/types/floorplan';
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

export interface RoomEstimate {
  roomId: string;
  roomName: string;
  center: { x: number; y: number };
  floorArea: number; // in m²
  ceilingArea: number; // in m²
  grossWallArea: number; // in m²
  openingsArea: number; // in m²
  netWallArea: number; // in m²
  wallFinishItems: WallFinishLineItem[];
  surfaceFinishItems: SurfaceFinishLineItem[];
  furnitureItems: FurnitureLineItem[];
  materialsSubtotal: number;
  furnitureSubtotal: number;
  laborCost: number;
  subtotal: number;
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
  roomEstimates: RoomEstimate[];
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
  rooms?: Room[];
  wasteFactor?: number; // default 0.10 (10%)
  includeLabor?: boolean; // default true
  laborRatePerSqm?: number; // default 25 $/m²
  includeDelivery?: boolean; // default true
  deliveryFee?: number; // default 25 $
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
export const DEFAULT_DELIVERY_FEE = 25; // in USD (~320,000 UZS)

export interface MarketPresetData {
  materialPrices: Record<string, number>;
  laborRatePerSqm: number;
  deliveryFee: number;
}

/**
 * Uzbekistan Market Price Presets for Tashkent & Regional Renovation Markets:
 * - 'standard': Abu Sahiy / O‘rikzor renovation market averages
 * - 'premium': High-end European/Turkish imports & designer euro-renovation
 */
export function getUzbekistanMarketPreset(preset: MarketPresetType): MarketPresetData {
  if (preset === 'standard') {
    return {
      materialPrices: {
        wp_linen_beige: 22.0,       // ~280 000 UZS/roll
        wp_vertical_stripes: 24.0,   // ~300 000 UZS/roll
        wp_sage_botanical: 25.0,     // ~320 000 UZS/roll
        wp_exposed_brick: 26.0,      // ~330 000 UZS/roll
        wp_venetian_plaster: 28.0,   // ~350 000 UZS/roll
        wp_acoustic_slats: 32.0,     // ~400 000 UZS/roll
        paint_pure_white: 9.5,       // ~120 000 UZS/L
        paint_warm_greige: 10.0,     // ~128 000 UZS/L
        paint_soft_sage: 10.5,       // ~134 000 UZS/L
        paint_terracotta: 11.0,      // ~140 000 UZS/L
        paint_midnight_navy: 11.5,   // ~147 000 UZS/L
        paint_charcoal_matte: 11.5,  // ~147 000 UZS/L
        floor_natural_oak: 14.0,     // ~180 000 UZS/m²
        floor_walnut_herringbone: 22.0, // ~280 000 UZS/m²
        floor_carrara_marble: 20.0,  // ~256 000 UZS/m²
        floor_warm_travertine: 18.0, // ~230 000 UZS/m²
        floor_light_concrete: 15.0,  // ~192 000 UZS/m²
        floor_slate_tile: 17.0,      // ~217 000 UZS/m²
        ceil_matte_white: 9.0,       // ~115 000 UZS/m²
        ceil_warm_cream: 9.5,        // ~120 000 UZS/m²
        ceil_acoustic_wood: 16.0,    // ~205 000 UZS/m²
        ceil_recessed_concrete: 12.0,// ~153 000 UZS/m²
      },
      laborRatePerSqm: 9.5, // ~120 000 UZS/m²
      deliveryFee: 20.0,    // ~250 000 UZS flat
    };
  }

  // Premium Evroremont
  return {
    materialPrices: {
      wp_linen_beige: 35.0,         // ~450 000 UZS/roll
      wp_vertical_stripes: 38.0,     // ~486 000 UZS/roll
      wp_sage_botanical: 42.0,       // ~537 000 UZS/roll
      wp_exposed_brick: 40.0,        // ~512 000 UZS/roll
      wp_venetian_plaster: 45.0,     // ~576 000 UZS/roll
      wp_acoustic_slats: 50.0,       // ~640 000 UZS/roll
      paint_pure_white: 17.0,        // ~217 000 UZS/L
      paint_warm_greige: 18.0,       // ~230 000 UZS/L
      paint_soft_sage: 18.5,         // ~236 000 UZS/L
      paint_terracotta: 19.0,        // ~243 000 UZS/L
      paint_midnight_navy: 20.0,     // ~256 000 UZS/L
      paint_charcoal_matte: 20.0,    // ~256 000 UZS/L
      floor_natural_oak: 26.0,       // ~330 000 UZS/m²
      floor_walnut_herringbone: 38.0,// ~486 000 UZS/m²
      floor_carrara_marble: 34.0,    // ~435 000 UZS/m²
      floor_warm_travertine: 32.0,   // ~410 000 UZS/m²
      floor_light_concrete: 25.0,    // ~320 000 UZS/m²
      floor_slate_tile: 28.0,        // ~358 000 UZS/m²
      ceil_matte_white: 15.0,        // ~192 000 UZS/m²
      ceil_warm_cream: 16.0,         // ~205 000 UZS/m²
      ceil_acoustic_wood: 28.0,      // ~358 000 UZS/m²
      ceil_recessed_concrete: 20.0,  // ~256 000 UZS/m²
    },
    laborRatePerSqm: 17.0, // ~220 000 UZS/m²
    deliveryFee: 39.0,     // ~500 000 UZS flat
  };
}

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
    rooms,
    wasteFactor = 0.1,
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

  // Master Labor and Delivery Fee hidden for pure material & furniture estimation
  const laborCost = 0;
  const deliveryCost = 0;

  // -------------------------------------------------------------
  // Room-by-Room Breakdown Calculation
  // -------------------------------------------------------------
  const activeRooms: Room[] =
    rooms && rooms.length > 0
      ? rooms
      : [
          {
            id: 'room_main_all',
            name: 'Asosiy Xonadon',
            x: 0,
            y: 0,
          },
        ];

  interface TempRoomEstimate extends RoomEstimate {
    roomMaterialAreaMap: Record<string, number>;
  }

  // 1. Identify which wall faces belong to which room
  const tempRoomEstimates: TempRoomEstimate[] = activeRooms.map((room) => {
    let roomGrossWallArea = 0;
    let roomOpeningsArea = 0;
    let roomNetWallArea = 0;
    const roomMaterialAreaMap: Record<string, number> = {};

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let hasAssociatedWalls = false;

    walls.forEach((wall) => {
      const wallLen = distance(wall.start, wall.end);
      if (wallLen < 0.05) return;

      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const lenSq = dx * dx + dy * dy;

      // Project room center onto wall segment
      const t = Math.max(0, Math.min(1, ((room.x - wall.start.x) * dx + (room.y - wall.start.y) * dy) / lenSq));
      const projX = wall.start.x + t * dx;
      const projY = wall.start.y + t * dy;
      const dist = Math.hypot(room.x - projX, room.y - projY);

      if (dist <= 5.5 || activeRooms.length === 1) {
        // Normal vector pointing to left side (+Z)
        const nLeftX = -dy;
        const nLeftY = dx;
        const toRoomX = room.x - wall.start.x;
        const toRoomY = room.y - wall.start.y;
        const sideDot = toRoomX * nLeftX + toRoomY * nLeftY;

        let isClosestToFace = true;
        if (activeRooms.length > 1) {
          for (const otherRoom of activeRooms) {
            if (otherRoom.id === room.id) continue;
            const otherDist = Math.hypot(otherRoom.x - projX, otherRoom.y - projY);
            if (otherDist < dist) {
              isClosestToFace = false;
              break;
            }
          }
        }

        if (isClosestToFace || activeRooms.length === 1) {
          hasAssociatedWalls = true;
          minX = Math.min(minX, wall.start.x, wall.end.x);
          maxX = Math.max(maxX, wall.start.x, wall.end.x);
          minY = Math.min(minY, wall.start.y, wall.end.y);
          maxY = Math.max(maxY, wall.start.y, wall.end.y);

          const grossFace = wallLen * ceilingHeight;
          const wallOps = openings.filter((o) => o.wallId === wall.id);
          const opsArea = wallOps.reduce((sum, o) => sum + o.width * o.height, 0);
          const netFace = Math.max(0, grossFace - opsArea);

          roomGrossWallArea += grossFace;
          roomOpeningsArea += opsArea;
          roomNetWallArea += netFace;

          const chosenMatId =
            sideDot >= 0
              ? wall.materialLeftId || DEFAULT_WALL_MATERIAL_ID
              : wall.materialRightId || DEFAULT_WALL_MATERIAL_ID;

          roomMaterialAreaMap[chosenMatId] =
            (roomMaterialAreaMap[chosenMatId] || 0) + netFace;
        }
      }
    });

    let rawRoomArea = 12.0;
    if (hasAssociatedWalls && maxX > minX && maxY > minY) {
      rawRoomArea = Math.max(4.0, (maxX - minX) * (maxY - minY) * 0.75);
    }

    return {
      roomId: room.id,
      roomName: room.name,
      center: { x: room.x, y: room.y },
      floorArea: rawRoomArea,
      ceilingArea: rawRoomArea,
      grossWallArea: roomGrossWallArea,
      openingsArea: roomOpeningsArea,
      netWallArea: roomNetWallArea,
      roomMaterialAreaMap,
      wallFinishItems: [],
      surfaceFinishItems: [],
      furnitureItems: [],
      materialsSubtotal: 0,
      furnitureSubtotal: 0,
      laborCost: 0,
      subtotal: 0,
    };
  });

  // 2. Normalize room areas to sum to total floorArea
  const sumRawAreas = tempRoomEstimates.reduce((sum, r) => sum + r.floorArea, 0);
  const roomEstimates: RoomEstimate[] = tempRoomEstimates.map((re) => {
    const normalizedArea =
      sumRawAreas > 0
        ? Number(((re.floorArea / sumRawAreas) * floorArea).toFixed(1))
        : Number((floorArea / activeRooms.length).toFixed(1));

    // Room wall finishes
    const roomWallItems: WallFinishLineItem[] = Object.entries(re.roomMaterialAreaMap).map(
      ([matId, netArea]) => {
        const mat = getMaterialById(matId);
        const isWallpaper = mat.category === 'wallpaper';
        const reserveArea = netArea * (1 + wasteFactor);
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

    // Room surfaces (floor & ceiling)
    const roomFloorReserve = Math.ceil(normalizedArea * (1 + wasteFactor));
    const roomCeilReserve = Math.ceil(normalizedArea * (1 + wasteFactor));
    const roomSurfaceItems: SurfaceFinishLineItem[] = [
      {
        type: 'flooring',
        materialId: floorMaterialId,
        materialName: floorMat.name,
        unit: 'sqm',
        netArea: normalizedArea,
        reserveArea: roomFloorReserve,
        unitPrice: floorUnitPrice,
        totalPrice: roomFloorReserve * floorUnitPrice,
        swatchColor: floorMat.color,
      },
      {
        type: 'ceiling',
        materialId: ceilingMaterialId,
        materialName: ceilMat.name,
        unit: 'sqm',
        netArea: normalizedArea,
        reserveArea: roomCeilReserve,
        unitPrice: ceilUnitPrice,
        totalPrice: roomCeilReserve * ceilUnitPrice,
        swatchColor: ceilMat.color,
      },
    ];

    // Furniture in this room
    const assignedFurniture = furniture.filter((f) => {
      if (activeRooms.length === 1) return true;
      let closestId = activeRooms[0].id;
      let minD = Infinity;
      for (const ar of activeRooms) {
        const d = Math.hypot(f.position[0] - ar.x, f.position[2] - ar.y);
        if (d < minD) {
          minD = d;
          closestId = ar.id;
        }
      }
      return closestId === re.roomId;
    });

    const roomFurnMap: Record<string, { item: PlacedFurniture; count: number }> = {};
    assignedFurniture.forEach((f) => {
      if (!roomFurnMap[f.catalogId]) roomFurnMap[f.catalogId] = { item: f, count: 0 };
      roomFurnMap[f.catalogId].count += 1;
    });

    const roomFurnItems: FurnitureLineItem[] = Object.values(roomFurnMap).map(
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

    const roomMatCost =
      roomWallItems.reduce((s, it) => s + it.totalPrice, 0) +
      roomSurfaceItems.reduce((s, it) => s + it.totalPrice, 0);
    const roomFurnCost = roomFurnItems.reduce((s, it) => s + it.totalPrice, 0);

    return {
      roomId: re.roomId,
      roomName: re.roomName,
      center: re.center,
      floorArea: normalizedArea,
      ceilingArea: normalizedArea,
      grossWallArea: re.grossWallArea,
      openingsArea: re.openingsArea,
      netWallArea: re.netWallArea,
      wallFinishItems: roomWallItems,
      surfaceFinishItems: roomSurfaceItems,
      furnitureItems: roomFurnItems,
      materialsSubtotal: roomMatCost,
      furnitureSubtotal: roomFurnCost,
      laborCost: 0,
      subtotal: roomMatCost + roomFurnCost,
    };
  });

  const grandTotal = finishingMaterialsSubtotal + furnitureSubtotal;

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
    roomEstimates,
    finishingMaterialsSubtotal,
    furnitureSubtotal,
    laborCost,
    deliveryCost,
    grandTotal,
    wasteFactor,
  };
}
