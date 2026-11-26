import { Wall, Opening, Room, PlacedFurniture } from '@/types/floorplan';
import { splitWallsAtIntersections } from '@/lib/wallGeometry';
import { autoFurnishFloorplan } from '@/lib/autoFurnish';

export interface HouseGeneratorParams {
  width: number; // e.g. 8m - 24m (default 14m)
  depth: number; // e.g. 8m - 20m (default 11m)
  bedrooms: number; // 1 to 5 (default 3)
  bathrooms: number; // 1 to 3 (default 2)
  kitchenType: 'separate' | 'studio'; // 'separate' | 'studio'
  includeLivingRoom: boolean; // default true
  includeHallway: boolean; // default true
  includeTerrace: boolean;
  includeGarage: boolean;
  includeSummerKitchen: boolean;
  includeStorage: boolean;
  includeOffice: boolean;
  language: 'uz' | 'ru';
}

export interface GeneratedFloorplanVariant {
  id: string;
  title: string;
  styleKey: string;
  badgeText: string;
  description: string;
  width: number;
  depth: number;
  totalAreaSqm: number;
  estimatedCostMinUsd: number;
  estimatedCostMaxUsd: number;
  roomCounts: {
    bedrooms: number;
    bathrooms: number;
    living: number;
    kitchen: number;
    others: number;
  };
  walls: Wall[];
  openings: Opening[];
  rooms: Room[];
  furniture: PlacedFurniture[];
}

interface InternalDraft {
  walls: Wall[];
  openings: Opening[];
  rooms: Room[];
  roomCounts: {
    bedrooms: number;
    bathrooms: number;
    living: number;
    kitchen: number;
    others: number;
  };
}

// Helper to create an exterior or interior wall
function makeWall(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  isExterior = false
): Wall {
  return {
    id,
    start: { x: Number(x1.toFixed(3)), y: Number(y1.toFixed(3)) },
    end: { x: Number(x2.toFixed(3)), y: Number(y2.toFixed(3)) },
    thickness: isExterior ? 0.25 : 0.15,
    materialLeftId: isExterior ? 'mat_brick_modern' : 'mat_white_paint',
    materialRightId: 'mat_white_paint',
  };
}

// Helper to create an opening (door or window)
function makeOpening(
  id: string,
  wallId: string,
  type: 'door' | 'window',
  positionRatio: number,
  width: number,
  height = 2.1,
  sillHeight = 0,
  flip = false
): Opening {
  return {
    id,
    wallId,
    type,
    positionRatio: Number(positionRatio.toFixed(3)),
    width: Number(width.toFixed(2)),
    height: Number(height.toFixed(2)),
    sillHeight: Number(sillHeight.toFixed(2)),
    flip,
  };
}

// Helper to create a room label anchor
function makeRoom(id: string, name: string, x: number, y: number, color?: string): Room {
  return {
    id,
    name,
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    color,
  };
}

/**
 * Calculates rough construction and finishing budget range in USD ($220–$350 / sqm)
 */
function calculateBudgetRange(areaSqm: number): { minUsd: number; maxUsd: number } {
  const minUsd = Math.round(areaSqm * 220);
  const maxUsd = Math.round(areaSqm * 350);
  return { minUsd, maxUsd };
}

// Localized Room Names Generator
function getRoomNames(lang: 'uz' | 'ru') {
  if (lang === 'ru') {
    return {
      living: 'Гостиная (Зал)',
      openLiving: 'Гостиная-Студия',
      kitchen: 'Кухня',
      diningKitchen: 'Кухня-Столовая',
      masterBed: 'Хозяйская спальня',
      bedroom: (n: number) => `Спальня ${n}`,
      bath: 'Санузел / Ванная',
      masterBath: 'Ванная комната',
      hallway: 'Холл / Коридор',
      tambur: 'Прихожая / Тамбур',
      terrace: 'Терраса / Айван',
      garage: 'Гараж',
      summerKitchen: 'Летняя кухня',
      storage: 'Кладовая / Гардероб',
      office: 'Кабинет',
    };
  }
  return {
    living: 'Katta Mehmonxona (Zal)',
    openLiving: 'Mehmonxona-Studiya',
    kitchen: 'Oshxona',
    diningKitchen: 'Keng Oshxona & Dasturxonxona',
    masterBed: 'Ota-onalar yotoqxonasi',
    bedroom: (n: number) => `${n}-Yotoqxona`,
    bath: 'Hammom & Sanuzel',
    masterBath: 'Alohida Hammom',
    hallway: 'Keng Yo‘lak (Hol)',
    tambur: 'Dahliz / Tambur',
    terrace: 'Ayvon / Terassa',
    garage: 'Garaj',
    summerKitchen: 'Yozgi oshxona',
    storage: 'Garderob / Omborxona',
    office: 'Ish xonasi (Kabinet)',
  };
}

/**
 * Layout 1: Klassik Markaziy Yo‘lak (Central Hallway)
 */
function buildCentralHallwayLayout(p: HouseGeneratorParams): InternalDraft {
  const { width: W, depth: D, language } = p;
  const rn = getRoomNames(language);
  const walls: Wall[] = [];
  const openings: Opening[] = [];
  const rooms: Room[] = [];

  // Perimeter
  walls.push(makeWall('p_b', 0, D, W, D, true)); // Front / bottom
  walls.push(makeWall('p_t', 0, 0, W, 0, true)); // Rear / top
  walls.push(makeWall('p_l', 0, 0, 0, D, true)); // Left
  walls.push(makeWall('p_r', W, 0, W, D, true)); // Right

  // Front Entrance Door on p_b
  openings.push(makeOpening('op_ent', 'p_b', 'door', 0.5, 1.0, 2.1, 0, false));

  // Central corridor spine (X between 0.44W and 0.56W)
  const cX1 = Number((W * 0.44).toFixed(3));
  const cX2 = Number((W * 0.56).toFixed(3));
  const midY = Number((D * 0.5).toFixed(3));

  // Spine walls
  walls.push(makeWall('spine_l', cX1, 0, cX1, D, false));
  walls.push(makeWall('spine_r', cX2, 0, cX2, D, false));

  // Left wing dividers (split into Living and Kitchen/Bath)
  walls.push(makeWall('div_l1', 0, midY, cX1, midY, false));

  // Right wing divider (split into Master Bedroom and Bedroom 2)
  walls.push(makeWall('div_r1', cX2, midY, W, midY, false));

  // Doors along central hallway
  openings.push(makeOpening('d_liv', 'spine_l', 'door', 0.75, 0.9, 2.1, 0, true));
  openings.push(makeOpening('d_kit', 'spine_l', 'door', 0.25, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_bed1', 'spine_r', 'door', 0.75, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_bed2', 'spine_r', 'door', 0.25, 0.9, 2.1, 0, true));

  // Windows
  openings.push(makeOpening('w_liv', 'p_l', 'window', 0.75, 1.6, 1.4, 0.9));
  openings.push(makeOpening('w_kit', 'p_l', 'window', 0.25, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_b1', 'p_r', 'window', 0.75, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_b2', 'p_r', 'window', 0.25, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_top_h', 'p_t', 'window', 0.5, 1.2, 1.4, 0.9));

  // If 3+ bedrooms, sub-divide rear right room
  if (p.bedrooms >= 3) {
    const rearSubY = Number((D * 0.28).toFixed(3));
    walls.push(makeWall('div_r_sub', cX2, rearSubY, W, rearSubY, false));
    openings.push(makeOpening('d_bed3', 'spine_r', 'door', 0.12, 0.85, 2.1, 0, false));
    openings.push(makeOpening('w_b3', 'p_t', 'window', 0.8, 1.4, 1.4, 0.9));
    rooms.push(makeRoom('r_bed3', rn.bedroom(3), (cX2 + W) / 2, rearSubY / 2, '#6366f1'));
  }

  // Bathroom in rear-left
  const bathX = Number((cX1 * 0.45).toFixed(3));
  const bathY = Number((midY * 0.5).toFixed(3));
  walls.push(makeWall('bath_w1', bathX, 0, bathX, bathY, false));
  walls.push(makeWall('bath_w2', 0, bathY, bathX, bathY, false));
  openings.push(makeOpening('d_bath', 'bath_w2', 'door', 0.5, 0.8, 2.1, 0, false));
  openings.push(makeOpening('w_bath', 'p_t', 'window', 0.15, 0.8, 0.9, 1.4));

  // Rooms
  rooms.push(makeRoom('r_hall', rn.hallway, (cX1 + cX2) / 2, D * 0.5, '#06b6d4'));
  rooms.push(makeRoom('r_liv', rn.living, cX1 * 0.5, (midY + D) / 2, '#3b82f6'));
  rooms.push(makeRoom('r_kit', rn.kitchen, (bathX + cX1) / 2, midY * 0.5, '#10b981'));
  rooms.push(makeRoom('r_bath', rn.bath, bathX * 0.5, bathY * 0.5, '#0ea5e9'));
  rooms.push(makeRoom('r_bed1', rn.masterBed, (cX2 + W) / 2, (midY + D) / 2, '#8b5cf6'));
  rooms.push(makeRoom('r_bed2', rn.bedroom(2), (cX2 + W) / 2, p.bedrooms >= 3 ? (D * 0.28 + midY) / 2 : midY * 0.5, '#a855f7'));

  return {
    walls,
    openings,
    rooms,
    roomCounts: {
      bedrooms: p.bedrooms >= 3 ? 3 : 2,
      bathrooms: 1,
      living: 1,
      kitchen: 1,
      others: 1,
    },
  };
}

/**
 * Layout 2: Zamonaviy Open-Space (Modern Open-Concept)
 */
function buildOpenSpaceLayout(p: HouseGeneratorParams): InternalDraft {
  const { width: W, depth: D, language } = p;
  const rn = getRoomNames(language);
  const walls: Wall[] = [];
  const openings: Opening[] = [];
  const rooms: Room[] = [];

  // Perimeter
  walls.push(makeWall('p_b', 0, D, W, D, true));
  walls.push(makeWall('p_t', 0, 0, W, 0, true));
  walls.push(makeWall('p_l', 0, 0, 0, D, true));
  walls.push(makeWall('p_r', W, 0, W, D, true));

  // Split: Front 55% is Great Open Living/Dining/Kitchen; Rear 45% is private bedrooms
  const splitY = Number((D * 0.52).toFixed(3));
  walls.push(makeWall('main_div', 0, splitY, W, splitY, false));

  // Front Entrance
  openings.push(makeOpening('op_ent', 'p_b', 'door', 0.15, 1.0, 2.1, 0, false));

  // Great room windows & patio glass door
  openings.push(makeOpening('w_liv1', 'p_b', 'window', 0.65, 1.8, 1.4, 0.9));
  openings.push(makeOpening('w_liv2', 'p_b', 'window', 0.85, 1.8, 1.4, 0.9));
  openings.push(makeOpening('w_kit', 'p_l', 'window', 0.75, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_liv_r', 'p_r', 'window', 0.75, 1.6, 1.4, 0.9));

  // Rear bedroom partitions (split rear into 2 or 3 rooms + bathroom)
  const bed1X = Number((W * 0.4).toFixed(3));
  const bed2X = Number((W * 0.72).toFixed(3));

  walls.push(makeWall('div_b1', bed1X, 0, bed1X, splitY, false));
  walls.push(makeWall('div_b2', bed2X, 0, bed2X, splitY, false));

  // Doors into bedrooms from Great Room
  openings.push(makeOpening('d_b1', 'main_div', 'door', 0.2, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_b2', 'main_div', 'door', 0.55, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_b3', 'main_div', 'door', 0.85, 0.9, 2.1, 0, true));

  // Windows in bedrooms
  openings.push(makeOpening('w_b1', 'p_t', 'window', 0.2, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_b2', 'p_t', 'window', 0.56, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_b3', 'p_t', 'window', 0.86, 1.4, 1.4, 0.9));

  // Bathroom inside Master Bedroom or off hallway
  const bathW = Number((bed1X * 0.45).toFixed(3));
  const bathH = Number((splitY * 0.5).toFixed(3));
  walls.push(makeWall('bath_div', bathW, 0, bathW, bathH, false));
  walls.push(makeWall('bath_div_h', 0, bathH, bathW, bathH, false));
  openings.push(makeOpening('d_bath', 'bath_div_h', 'door', 0.5, 0.8, 2.1, 0, false));
  openings.push(makeOpening('w_bath', 'p_l', 'window', 0.15, 0.8, 0.9, 1.4));

  rooms.push(makeRoom('r_open', rn.openLiving, W * 0.6, (splitY + D) / 2, '#3b82f6'));
  rooms.push(makeRoom('r_kit', rn.kitchen, W * 0.18, (splitY + D) / 2, '#10b981'));
  rooms.push(makeRoom('r_b1', rn.masterBed, (bathW + bed1X) / 2, splitY * 0.5, '#8b5cf6'));
  rooms.push(makeRoom('r_bath', rn.bath, bathW * 0.5, bathH * 0.5, '#0ea5e9'));
  rooms.push(makeRoom('r_b2', rn.bedroom(2), (bed1X + bed2X) / 2, splitY * 0.5, '#6366f1'));
  rooms.push(makeRoom('r_b3', rn.bedroom(3), (bed2X + W) / 2, splitY * 0.5, '#ec4899'));

  return {
    walls,
    openings,
    rooms,
    roomCounts: {
      bedrooms: 3,
      bathrooms: 1,
      living: 1,
      kitchen: 1,
      others: 0,
    },
  };
}

/**
 * Layout 3: Ikki Qanotli (Split-Wing Master Suite)
 */
function buildSplitWingLayout(p: HouseGeneratorParams): InternalDraft {
  const { width: W, depth: D, language } = p;
  const rn = getRoomNames(language);
  const walls: Wall[] = [];
  const openings: Opening[] = [];
  const rooms: Room[] = [];

  // Perimeter
  walls.push(makeWall('p_b', 0, D, W, D, true));
  walls.push(makeWall('p_t', 0, 0, W, 0, true));
  walls.push(makeWall('p_l', 0, 0, 0, D, true));
  walls.push(makeWall('p_r', W, 0, W, D, true));

  // Three structural bays: Left Wing (30%), Center Living (40%), Right Wing (30%)
  const x1 = Number((W * 0.32).toFixed(3));
  const x2 = Number((W * 0.68).toFixed(3));

  walls.push(makeWall('wing_l', x1, 0, x1, D, false));
  walls.push(makeWall('wing_r', x2, 0, x2, D, false));

  // Front Entrance into Center Great Room
  openings.push(makeOpening('op_ent', 'p_b', 'door', 0.5, 1.0, 2.1, 0, false));

  // Doors into Left and Right Wings
  openings.push(makeOpening('d_wing_l', 'wing_l', 'door', 0.5, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_wing_r', 'wing_r', 'door', 0.5, 0.9, 2.1, 0, true));

  // Left Wing divider: Master Bedroom + Master Bath
  const leftMidY = Number((D * 0.55).toFixed(3));
  walls.push(makeWall('div_l', 0, leftMidY, x1, leftMidY, false));
  openings.push(makeOpening('d_mbath', 'div_l', 'door', 0.5, 0.8, 2.1, 0, false));

  // Right Wing divider: Bedroom 2 + Bedroom 3
  const rightMidY = Number((D * 0.5).toFixed(3));
  walls.push(makeWall('div_r', x2, rightMidY, W, rightMidY, false));
  openings.push(makeOpening('d_rb1', 'wing_r', 'door', 0.25, 0.85, 2.1, 0, false));
  openings.push(makeOpening('d_rb2', 'wing_r', 'door', 0.75, 0.85, 2.1, 0, true));

  // Windows
  openings.push(makeOpening('w_cent_b', 'p_b', 'window', 0.5, 1.8, 1.4, 0.9));
  openings.push(makeOpening('w_cent_t', 'p_t', 'window', 0.5, 1.8, 1.4, 0.9));
  openings.push(makeOpening('w_l_top', 'p_l', 'window', 0.25, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_l_bot', 'p_l', 'window', 0.75, 1.6, 1.4, 0.9));
  openings.push(makeOpening('w_r_top', 'p_r', 'window', 0.25, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_r_bot', 'p_r', 'window', 0.75, 1.4, 1.4, 0.9));

  // Rooms
  rooms.push(makeRoom('r_cent', rn.living, (x1 + x2) / 2, D * 0.6, '#3b82f6'));
  rooms.push(makeRoom('r_kit', rn.kitchen, (x1 + x2) / 2, D * 0.2, '#10b981'));
  rooms.push(makeRoom('r_mbed', rn.masterBed, x1 * 0.5, (leftMidY + D) / 2, '#8b5cf6'));
  rooms.push(makeRoom('r_mbath', rn.masterBath, x1 * 0.5, leftMidY * 0.5, '#0ea5e9'));
  rooms.push(makeRoom('r_bed2', rn.bedroom(2), (x2 + W) / 2, (rightMidY + D) / 2, '#6366f1'));
  rooms.push(makeRoom('r_bed3', rn.bedroom(3), (x2 + W) / 2, rightMidY * 0.5, '#a855f7'));

  return {
    walls,
    openings,
    rooms,
    roomCounts: {
      bedrooms: 3,
      bathrooms: 1,
      living: 1,
      kitchen: 1,
      others: 0,
    },
  };
}

/**
 * Layout 4: Hovli va Terassali Villa (Courtyard / Terrace Villa)
 */
function buildTerraceVillaLayout(p: HouseGeneratorParams): InternalDraft {
  const { width: W, depth: D, language } = p;
  const rn = getRoomNames(language);
  const walls: Wall[] = [];
  const openings: Opening[] = [];
  const rooms: Room[] = [];

  // Inset Terrace at top-right corner (3.8m x 3.2m or 30% x 35%)
  const terrW = Number((W * 0.35).toFixed(3));
  const terrH = Number((D * 0.35).toFixed(3));
  const terrX = Number((W - terrW).toFixed(3));

  // Outer walls (excluding terrace corner)
  walls.push(makeWall('p_b', 0, D, W, D, true)); // bottom
  walls.push(makeWall('p_l', 0, 0, 0, D, true)); // left
  walls.push(makeWall('p_t_main', 0, 0, terrX, 0, true)); // top up to terrace
  walls.push(makeWall('p_r_main', W, terrH, W, D, true)); // right below terrace
  // Terrace inner enclosure walls
  walls.push(makeWall('terr_in_h', terrX, terrH, W, terrH, true));
  walls.push(makeWall('terr_in_v', terrX, 0, terrX, terrH, true));

  // Front Entrance
  openings.push(makeOpening('op_ent', 'p_b', 'door', 0.2, 1.0, 2.1, 0, false));

  // Patio doors from Living/Dining onto Terrace
  openings.push(makeOpening('op_terr_door', 'terr_in_h', 'door', 0.5, 1.4, 2.1, 0, false));

  // Main partitions: Left = Bedrooms; Right = Living + Kitchen + Terrace
  const midX = Number((W * 0.5).toFixed(3));
  walls.push(makeWall('main_v', midX, 0, midX, D, false));

  // Left wing partitions: Master Bedroom & Bedroom 2 & Bath
  const leftMidY = Number((D * 0.48).toFixed(3));
  walls.push(makeWall('div_l1', 0, leftMidY, midX, leftMidY, false));

  const bathH = Number((leftMidY * 0.45).toFixed(3));
  walls.push(makeWall('div_bath_v', midX * 0.4, 0, midX * 0.4, bathH, false));
  walls.push(makeWall('div_bath_h', 0, bathH, midX * 0.4, bathH, false));

  // Right wing partitions: Living Room (front) and Kitchen/Dining (facing terrace)
  const rightMidY = Number((D * 0.55).toFixed(3));
  walls.push(makeWall('div_r1', midX, rightMidY, W, rightMidY, false));

  // Doors
  openings.push(makeOpening('d_b1', 'main_v', 'door', 0.75, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_b2', 'main_v', 'door', 0.35, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_bath', 'div_bath_h', 'door', 0.5, 0.8, 2.1, 0, false));
  openings.push(makeOpening('d_kit', 'div_r1', 'door', 0.5, 0.9, 2.1, 0, false));

  // Windows
  openings.push(makeOpening('w_liv', 'p_b', 'window', 0.75, 1.8, 1.4, 0.9));
  openings.push(makeOpening('w_bed1', 'p_b', 'window', 0.25, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_bed2', 'p_l', 'window', 0.75, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_bath', 'p_t_main', 'window', 0.15, 0.8, 0.9, 1.4));

  rooms.push(makeRoom('r_terr', rn.terrace, terrX + terrW * 0.5, terrH * 0.5, '#f59e0b'));
  rooms.push(makeRoom('r_kit', rn.diningKitchen, (midX + terrX) / 2, (terrH + rightMidY) / 2, '#10b981'));
  rooms.push(makeRoom('r_liv', rn.living, (midX + W) / 2, (rightMidY + D) / 2, '#3b82f6'));
  rooms.push(makeRoom('r_bed1', rn.masterBed, midX * 0.5, (leftMidY + D) / 2, '#8b5cf6'));
  rooms.push(makeRoom('r_bed2', rn.bedroom(2), (midX * 0.4 + midX) / 2, leftMidY * 0.5, '#6366f1'));
  rooms.push(makeRoom('r_bath', rn.bath, midX * 0.2, bathH * 0.5, '#0ea5e9'));

  return {
    walls,
    openings,
    rooms,
    roomCounts: {
      bedrooms: 2,
      bathrooms: 1,
      living: 1,
      kitchen: 1,
      others: 1, // Terrace
    },
  };
}

/**
 * Layout 5: Simmetrik Oilaviy Uy (Symmetrical Family Home)
 */
function buildSymmetricalLayout(p: HouseGeneratorParams): InternalDraft {
  const { width: W, depth: D, language } = p;
  const rn = getRoomNames(language);
  const walls: Wall[] = [];
  const openings: Opening[] = [];
  const rooms: Room[] = [];

  // Perimeter
  walls.push(makeWall('p_b', 0, D, W, D, true));
  walls.push(makeWall('p_t', 0, 0, W, 0, true));
  walls.push(makeWall('p_l', 0, 0, 0, D, true));
  walls.push(makeWall('p_r', W, 0, W, D, true));

  // Central axis corridor/tambur (e.g. 2.4m wide in center)
  const cW = Number((Math.max(2.2, W * 0.2)).toFixed(3));
  const cX1 = Number(((W - cW) / 2).toFixed(3));
  const cX2 = Number(((W + cW) / 2).toFixed(3));
  const midY = Number((D * 0.5).toFixed(3));

  walls.push(makeWall('cent_l', cX1, 0, cX1, D, false));
  walls.push(makeWall('cent_r', cX2, 0, cX2, D, false));

  // Front Tambur divider
  const tamburY = Number((D * 0.78).toFixed(3));
  walls.push(makeWall('tambur_w', cX1, tamburY, cX2, tamburY, false));

  // Balanced Left & Right wing dividers
  walls.push(makeWall('div_l', 0, midY, cX1, midY, false));
  walls.push(makeWall('div_r', cX2, midY, W, midY, false));

  // Main Entrance
  openings.push(makeOpening('op_ent', 'p_b', 'door', 0.5, 1.2, 2.1, 0, false));
  openings.push(makeOpening('op_tambur_in', 'tambur_w', 'door', 0.5, 1.0, 2.1, 0, false));

  // Symmetrical room doors
  openings.push(makeOpening('d_l_front', 'cent_l', 'door', 0.65, 0.9, 2.1, 0, true));
  openings.push(makeOpening('d_l_rear', 'cent_l', 'door', 0.3, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_r_front', 'cent_r', 'door', 0.65, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_r_rear', 'cent_r', 'door', 0.3, 0.9, 2.1, 0, true));

  // Windows: balanced pairs on front and rear
  openings.push(makeOpening('w_f_l', 'p_b', 'window', 0.2, 1.6, 1.4, 0.9));
  openings.push(makeOpening('w_f_r', 'p_b', 'window', 0.8, 1.6, 1.4, 0.9));
  openings.push(makeOpening('w_r_l', 'p_t', 'window', 0.2, 1.6, 1.4, 0.9));
  openings.push(makeOpening('w_r_r', 'p_t', 'window', 0.8, 1.6, 1.4, 0.9));

  // Rooms
  rooms.push(makeRoom('r_tambur', rn.tambur, W * 0.5, (tamburY + D) / 2, '#f59e0b'));
  rooms.push(makeRoom('r_hall', rn.hallway, W * 0.5, (tamburY + midY) / 2, '#06b6d4'));
  rooms.push(makeRoom('r_liv', rn.living, cX1 * 0.5, (midY + D) / 2, '#3b82f6'));
  rooms.push(makeRoom('r_kit', rn.kitchen, (cX2 + W) / 2, (midY + D) / 2, '#10b981'));
  rooms.push(makeRoom('r_b1', rn.masterBed, cX1 * 0.5, midY * 0.5, '#8b5cf6'));
  rooms.push(makeRoom('r_b2', rn.bedroom(2), (cX2 + W) / 2, midY * 0.5, '#6366f1'));

  return {
    walls,
    openings,
    rooms,
    roomCounts: {
      bedrooms: 2,
      bathrooms: 1,
      living: 1,
      kitchen: 1,
      others: 1,
    },
  };
}

/**
 * Layout 6: Burchakli Zal (Corner Panorama)
 */
function buildCornerPanoramaLayout(p: HouseGeneratorParams): InternalDraft {
  const { width: W, depth: D, language } = p;
  const rn = getRoomNames(language);
  const walls: Wall[] = [];
  const openings: Opening[] = [];
  const rooms: Room[] = [];

  // Perimeter
  walls.push(makeWall('p_b', 0, D, W, D, true));
  walls.push(makeWall('p_t', 0, 0, W, 0, true));
  walls.push(makeWall('p_l', 0, 0, 0, D, true));
  walls.push(makeWall('p_r', W, 0, W, D, true));

  // Corner Living Room occupies bottom-left quadrant (55% width x 55% depth)
  const cX = Number((W * 0.55).toFixed(3));
  const cY = Number((D * 0.45).toFixed(3));

  walls.push(makeWall('liv_top', 0, cY, cX, cY, false));
  walls.push(makeWall('liv_right', cX, cY, cX, D, false));

  // Dual-aspect panoramic corner windows
  openings.push(makeOpening('w_pano_l1', 'p_l', 'window', 0.65, 1.8, 1.4, 0.9));
  openings.push(makeOpening('w_pano_l2', 'p_l', 'window', 0.88, 1.8, 1.4, 0.9));
  openings.push(makeOpening('w_pano_b1', 'p_b', 'window', 0.25, 1.8, 1.4, 0.9));

  // Front Entrance into hallway at bottom-right
  openings.push(makeOpening('op_ent', 'p_b', 'door', 0.75, 1.0, 2.1, 0, false));

  // Living room double door
  openings.push(makeOpening('d_liv', 'liv_right', 'door', 0.5, 1.2, 2.1, 0, true));

  // Top area: split into Kitchen (top-left) and Master Bedroom (top-right)
  walls.push(makeWall('div_top', cX, 0, cX, cY, false));

  // Bottom-right area: Bedroom 2 + Bathroom
  const rightMidY = Number((cY + (D - cY) * 0.5).toFixed(3));
  walls.push(makeWall('div_br', cX, rightMidY, W, rightMidY, false));

  // Doors
  openings.push(makeOpening('d_kit', 'liv_top', 'door', 0.5, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_b1', 'div_top', 'door', 0.5, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_b2', 'div_br', 'door', 0.5, 0.85, 2.1, 0, false));

  // Windows
  openings.push(makeOpening('w_kit', 'p_t', 'window', 0.25, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_b1', 'p_t', 'window', 0.78, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_b2', 'p_r', 'window', 0.35, 1.4, 1.4, 0.9));

  // Rooms
  rooms.push(makeRoom('r_liv', rn.living, cX * 0.5, (cY + D) / 2, '#3b82f6'));
  rooms.push(makeRoom('r_kit', rn.kitchen, cX * 0.5, cY * 0.5, '#10b981'));
  rooms.push(makeRoom('r_b1', rn.masterBed, (cX + W) / 2, cY * 0.5, '#8b5cf6'));
  rooms.push(makeRoom('r_b2', rn.bedroom(2), (cX + W) / 2, (cY + rightMidY) / 2, '#6366f1'));
  rooms.push(makeRoom('r_bath', rn.bath, (cX + W) / 2, (rightMidY + D) / 2, '#0ea5e9'));

  return {
    walls,
    openings,
    rooms,
    roomCounts: {
      bedrooms: 2,
      bathrooms: 1,
      living: 1,
      kitchen: 1,
      others: 0,
    },
  };
}

/**
 * Layout 7: Kompakt Yevropa Uslubi (Compact European)
 */
function buildCompactEuropeanLayout(p: HouseGeneratorParams): InternalDraft {
  const { width: W, depth: D, language } = p;
  const rn = getRoomNames(language);
  const walls: Wall[] = [];
  const openings: Opening[] = [];
  const rooms: Room[] = [];

  // Perimeter
  walls.push(makeWall('p_b', 0, D, W, D, true));
  walls.push(makeWall('p_t', 0, 0, W, 0, true));
  walls.push(makeWall('p_l', 0, 0, 0, D, true));
  walls.push(makeWall('p_r', W, 0, W, D, true));

  // Ultra-efficient 4-quadrant layout with tiny central hub
  const midX = Number((W * 0.5).toFixed(3));
  const midY = Number((D * 0.5).toFixed(3));

  // Cross partitions
  walls.push(makeWall('cross_v1', midX, 0, midX, D, false));
  walls.push(makeWall('cross_h1', 0, midY, W, midY, false));

  // Front Entrance into center
  openings.push(makeOpening('op_ent', 'p_b', 'door', 0.5, 1.0, 2.1, 0, false));

  // Compact doors directly from central nexus
  openings.push(makeOpening('d_liv', 'cross_v1', 'door', 0.75, 0.9, 2.1, 0, true));
  openings.push(makeOpening('d_kit', 'cross_v1', 'door', 0.25, 0.9, 2.1, 0, true));
  openings.push(makeOpening('d_b1', 'cross_v1', 'door', 0.75, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_b2', 'cross_v1', 'door', 0.25, 0.9, 2.1, 0, false));

  // Windows in each quadrant
  openings.push(makeOpening('w_liv', 'p_b', 'window', 0.25, 1.6, 1.4, 0.9));
  openings.push(makeOpening('w_kit', 'p_t', 'window', 0.25, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_b1', 'p_b', 'window', 0.75, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_b2', 'p_t', 'window', 0.75, 1.4, 1.4, 0.9));

  // Bathroom tucked inside rear-right quadrant
  const bathX = Number((midX + (W - midX) * 0.45).toFixed(3));
  const bathY = Number((midY * 0.5).toFixed(3));
  walls.push(makeWall('bath_h', midX, bathY, bathX, bathY, false));
  walls.push(makeWall('bath_v', bathX, 0, bathX, bathY, false));
  openings.push(makeOpening('d_bath', 'bath_h', 'door', 0.5, 0.8, 2.1, 0, false));
  openings.push(makeOpening('w_bath', 'p_t', 'window', 0.58, 0.8, 0.9, 1.4));

  rooms.push(makeRoom('r_liv', rn.living, midX * 0.5, (midY + D) / 2, '#3b82f6'));
  rooms.push(makeRoom('r_kit', rn.kitchen, midX * 0.5, midY * 0.5, '#10b981'));
  rooms.push(makeRoom('r_b1', rn.masterBed, (midX + W) / 2, (midY + D) / 2, '#8b5cf6'));
  rooms.push(makeRoom('r_b2', rn.bedroom(2), (bathX + W) / 2, midY * 0.5, '#6366f1'));
  rooms.push(makeRoom('r_bath', rn.bath, (midX + bathX) / 2, bathY * 0.5, '#0ea5e9'));

  return {
    walls,
    openings,
    rooms,
    roomCounts: {
      bedrooms: 2,
      bathrooms: 1,
      living: 1,
      kitchen: 1,
      others: 0,
    },
  };
}

/**
 * Layout 8: Keng Oshxona-Mehmonxona (Culinary Hub)
 */
function buildCulinaryHubLayout(p: HouseGeneratorParams): InternalDraft {
  const { width: W, depth: D, language } = p;
  const rn = getRoomNames(language);
  const walls: Wall[] = [];
  const openings: Opening[] = [];
  const rooms: Room[] = [];

  // Perimeter
  walls.push(makeWall('p_b', 0, D, W, D, true));
  walls.push(makeWall('p_t', 0, 0, W, 0, true));
  walls.push(makeWall('p_l', 0, 0, 0, D, true));
  walls.push(makeWall('p_r', W, 0, W, D, true));

  // Front 50%: Split between Grand Kitchen & Dining (left) and Formal Guest Salon (right)
  const frontY = Number((D * 0.5).toFixed(3));
  const midX = Number((W * 0.5).toFixed(3));

  walls.push(makeWall('front_split_h', 0, frontY, W, frontY, false));
  walls.push(makeWall('front_split_v', midX, frontY, midX, D, false));

  // Front Entrance into central vestibule/foyer
  openings.push(makeOpening('op_ent', 'p_b', 'door', 0.5, 1.2, 2.1, 0, false));

  // Wide double doors connecting Culinary Hub to Guest Salon
  openings.push(makeOpening('d_culinary_guest', 'front_split_v', 'door', 0.5, 1.5, 2.1, 0, true));

  // Windows for kitchen & living
  openings.push(makeOpening('w_kit1', 'p_b', 'window', 0.25, 1.6, 1.4, 0.9));
  openings.push(makeOpening('w_kit2', 'p_l', 'window', 0.75, 1.6, 1.4, 0.9));
  openings.push(makeOpening('w_guest1', 'p_b', 'window', 0.75, 1.8, 1.4, 0.9));
  openings.push(makeOpening('w_guest2', 'p_r', 'window', 0.75, 1.6, 1.4, 0.9));

  // Rear 50%: Secluded Family Bedrooms & Bathrooms
  const bedDivX = Number((W * 0.55).toFixed(3));
  walls.push(makeWall('rear_div_v', bedDivX, 0, bedDivX, frontY, false));

  // Doors to private zone
  openings.push(makeOpening('d_rear_b1', 'front_split_h', 'door', 0.25, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_rear_b2', 'front_split_h', 'door', 0.75, 0.9, 2.1, 0, false));

  // Windows for bedrooms
  openings.push(makeOpening('w_b1', 'p_t', 'window', 0.25, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_b2', 'p_t', 'window', 0.75, 1.4, 1.4, 0.9));

  // Bathroom in rear-center
  const bathW = Number((bedDivX * 0.35).toFixed(3));
  const bathH = Number((frontY * 0.45).toFixed(3));
  walls.push(makeWall('bath_v', bedDivX - bathW, 0, bedDivX - bathW, bathH, false));
  walls.push(makeWall('bath_h', bedDivX - bathW, bathH, bedDivX, bathH, false));
  openings.push(makeOpening('d_bath', 'bath_h', 'door', 0.5, 0.8, 2.1, 0, false));

  rooms.push(makeRoom('r_kit', rn.diningKitchen, midX * 0.5, (frontY + D) / 2, '#10b981'));
  rooms.push(makeRoom('r_liv', rn.living, (midX + W) / 2, (frontY + D) / 2, '#3b82f6'));
  rooms.push(makeRoom('r_b1', rn.masterBed, (bedDivX - bathW) * 0.5, frontY * 0.5, '#8b5cf6'));
  rooms.push(makeRoom('r_b2', rn.bedroom(2), (bedDivX + W) / 2, frontY * 0.5, '#6366f1'));
  rooms.push(makeRoom('r_bath', rn.bath, bedDivX - bathW * 0.5, bathH * 0.5, '#0ea5e9'));

  return {
    walls,
    openings,
    rooms,
    roomCounts: {
      bedrooms: 2,
      bathrooms: 1,
      living: 1,
      kitchen: 1,
      others: 0,
    },
  };
}

/**
 * Layout 9: Garaj / Yordamchi Blokli (Utility & Garage Wing)
 */
function buildUtilityGarageLayout(p: HouseGeneratorParams): InternalDraft {
  const { width: W, depth: D, language } = p;
  const rn = getRoomNames(language);
  const walls: Wall[] = [];
  const openings: Opening[] = [];
  const rooms: Room[] = [];

  // Perimeter
  walls.push(makeWall('p_b', 0, D, W, D, true));
  walls.push(makeWall('p_t', 0, 0, W, 0, true));
  walls.push(makeWall('p_l', 0, 0, 0, D, true));
  walls.push(makeWall('p_r', W, 0, W, D, true));

  // Side wing (Left 28% of width): Garage / Utility wing
  const gX = Number((Math.max(3.4, W * 0.28)).toFixed(3));
  walls.push(makeWall('garage_wall', gX, 0, gX, D, false));

  // Garage roll-up door on front bottom
  openings.push(makeOpening('op_garage_door', 'p_b', 'door', 0.14, 2.6, 2.2, 0, false));

  // Internal access door from garage into house
  openings.push(makeOpening('d_garage_in', 'garage_wall', 'door', 0.5, 0.9, 2.1, 0, false));

  // Main house entrance (center-bottom)
  openings.push(makeOpening('op_ent', 'p_b', 'door', 0.6, 1.0, 2.1, 0, false));

  // House block partitioning: Living (front-right) + Kitchen (mid) + Bedrooms (rear)
  const houseMidY = Number((D * 0.52).toFixed(3));
  walls.push(makeWall('house_div_h', gX, houseMidY, W, houseMidY, false));

  const bedSplitX = Number((gX + (W - gX) * 0.5).toFixed(3));
  walls.push(makeWall('bed_split_v', bedSplitX, 0, bedSplitX, houseMidY, false));

  // Doors
  openings.push(makeOpening('d_liv', 'house_div_h', 'door', 0.35, 0.9, 2.1, 0, false));
  openings.push(makeOpening('d_bed1', 'house_div_h', 'door', 0.8, 0.9, 2.1, 0, true));

  // Windows
  openings.push(makeOpening('w_liv', 'p_b', 'window', 0.8, 1.8, 1.4, 0.9));
  openings.push(makeOpening('w_b1', 'p_t', 'window', 0.5, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_b2', 'p_t', 'window', 0.85, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_r', 'p_r', 'window', 0.5, 1.4, 1.4, 0.9));

  // Rooms
  rooms.push(makeRoom('r_gar', p.includeGarage ? rn.garage : rn.summerKitchen, gX * 0.5, D * 0.5, '#64748b'));
  rooms.push(makeRoom('r_liv', rn.living, (gX + W) / 2, (houseMidY + D) / 2, '#3b82f6'));
  rooms.push(makeRoom('r_kit', rn.kitchen, (gX + bedSplitX) / 2, houseMidY * 0.5, '#10b981'));
  rooms.push(makeRoom('r_b1', rn.masterBed, (bedSplitX + W) / 2, houseMidY * 0.5, '#8b5cf6'));

  return {
    walls,
    openings,
    rooms,
    roomCounts: {
      bedrooms: 1,
      bathrooms: 1,
      living: 1,
      kitchen: 1,
      others: 1, // Garage / Utility
    },
  };
}

/**
 * Layout 10: L-Shaklli Zamonaviy Reja (L-Shape Privacy Layout)
 */
function buildLShapeLayout(p: HouseGeneratorParams): InternalDraft {
  const { width: W, depth: D, language } = p;
  const rn = getRoomNames(language);
  const walls: Wall[] = [];
  const openings: Opening[] = [];
  const rooms: Room[] = [];

  // L-Shape creates an open garden courtyard at bottom-right (35% W x 40% D)
  const cutW = Number((W * 0.38).toFixed(3));
  const cutH = Number((D * 0.38).toFixed(3));
  const lX = Number((W - cutW).toFixed(3));
  const lY = Number((D - cutH).toFixed(3));

  // L-Shape Perimeter
  walls.push(makeWall('p_t', 0, 0, W, 0, true)); // Top full width
  walls.push(makeWall('p_l', 0, 0, 0, D, true)); // Left full depth
  walls.push(makeWall('p_b_l', 0, D, lX, D, true)); // Bottom left
  walls.push(makeWall('p_inner_v', lX, lY, lX, D, true)); // Courtyard vertical wall
  walls.push(makeWall('p_inner_h', lX, lY, W, lY, true)); // Courtyard horizontal wall
  walls.push(makeWall('p_r_top', W, 0, W, lY, true)); // Right top wall

  // Main Entrance on bottom-left
  openings.push(makeOpening('op_ent', 'p_b_l', 'door', 0.5, 1.0, 2.1, 0, false));

  // Sliding glass doors opening onto the courtyard garden
  openings.push(makeOpening('op_patio', 'p_inner_v', 'door', 0.5, 1.6, 2.1, 0, false));

  // Zoning:
  // Vertical Wing (left): Living room + Foyer
  // Horizontal Wing (top): Kitchen + Bedrooms + Bathroom
  const wingSplitX = Number((lX * 0.7).toFixed(3));
  const wingSplitY = Number((D * 0.45).toFixed(3));

  walls.push(makeWall('div_wing_h', 0, wingSplitY, lX, wingSplitY, false));
  walls.push(makeWall('div_top_b1', wingSplitX, 0, wingSplitX, wingSplitY, false));

  // Doors
  openings.push(makeOpening('d_liv', 'div_wing_h', 'door', 0.5, 0.9, 2.1, 0, true));
  openings.push(makeOpening('d_b1', 'div_top_b1', 'door', 0.5, 0.9, 2.1, 0, false));

  // Windows
  openings.push(makeOpening('w_l_top', 'p_l', 'window', 0.25, 1.4, 1.4, 0.9));
  openings.push(makeOpening('w_l_bot', 'p_l', 'window', 0.75, 1.6, 1.4, 0.9));
  openings.push(makeOpening('w_top_r', 'p_t', 'window', 0.8, 1.6, 1.4, 0.9));

  rooms.push(makeRoom('r_liv', rn.living, lX * 0.5, (wingSplitY + D) / 2, '#3b82f6'));
  rooms.push(makeRoom('r_kit', rn.kitchen, wingSplitX * 0.5, wingSplitY * 0.5, '#10b981'));
  rooms.push(makeRoom('r_b1', rn.masterBed, (wingSplitX + W) / 2, lY * 0.5, '#8b5cf6'));
  rooms.push(makeRoom('r_terr', rn.terrace, (lX + W) / 2, (lY + D) / 2, '#f59e0b'));

  return {
    walls,
    openings,
    rooms,
    roomCounts: {
      bedrooms: 1,
      bathrooms: 1,
      living: 1,
      kitchen: 1,
      others: 1,
    },
  };
}

/**
 * Main Parametric Layout Engine:
 * Generates 10 distinct, fully-furnished, T-junction-split architectural variants
 */
export function generateHouseVariants(params: HouseGeneratorParams): GeneratedFloorplanVariant[] {
  const { width, depth, language } = params;
  const totalAreaSqm = Number((width * depth).toFixed(1));

  const isRu = language === 'ru';

  const archetypesConfig: Array<{
    id: string;
    styleKey: string;
    badgeText: string;
    title: string;
    description: string;
    builder: (p: HouseGeneratorParams) => InternalDraft;
  }> = [
    {
      id: 'var_central_hallway',
      styleKey: 'classic',
      badgeText: isRu ? 'Классика' : 'Klassik',
      title: isRu ? 'Классический коридорный план' : 'Klassik Markaziy Yo‘lak',
      description: isRu
        ? 'Традиционная планировка с центральным холлом. Идеальное разделение на гостевую и тихую спальную зоны.'
        : 'An’anaviy me’moriy yechim: markaziy yo‘lak orqali mehmonxona va yotoqxonalar bir-biridan mustaqil ajratilgan.',
      builder: buildCentralHallwayLayout,
    },
    {
      id: 'var_open_space',
      styleKey: 'modern',
      badgeText: isRu ? 'Open-Space' : 'Zamonaviy',
      title: isRu ? 'Современный Open-Concept' : 'Zamonaviy Open-Space',
      description: isRu
        ? 'Просторная объединенная гостиная-студия с кухней. Панорамные окна и максимум естественного света.'
        : 'Keng zal va oshxona yagona erkin hududda birlashtirilgan. Katta derazalar va maksimal tabiiy yorug‘lik.',
      builder: buildOpenSpaceLayout,
    },
    {
      id: 'var_split_wing',
      styleKey: 'premium',
      badgeText: isRu ? 'Приватность' : 'Ikki Qanotli',
      title: isRu ? 'Двукрылая вилла (Master Suite)' : 'Ikki Qanotli (Split-Wing)',
      description: isRu
        ? 'Хозяйская спальня изолирована в отдельном крыле. Детские и гостевые комнаты расположены напротив.'
        : 'Ota-onalar xonasi alohida qanotda ajratilgan. Bolalar va mehmonlar xonalari qarama-qarshi qanotda joylashgan.',
      builder: buildSplitWingLayout,
    },
    {
      id: 'var_terrace_villa',
      styleKey: 'villa',
      badgeText: isRu ? 'Вилла с террасой' : 'Hovli va Ayvon',
      title: isRu ? 'Вилла с крытой террасой' : 'Hovli va Terassali Villa',
      description: isRu
        ? 'Встроенная терраса/айван с выходом из кухни и зала. Идеально для отдыха на свежем воздухе.'
        : 'Oshxona va zaldan to‘g‘ridan-to‘g‘ri ayvonga chiqish imkoniyati. Ochiq havoda oilaviy hordiq uchun mo‘ljallangan.',
      builder: buildTerraceVillaLayout,
    },
    {
      id: 'var_symmetrical',
      styleKey: 'classic',
      badgeText: isRu ? 'Симметрия' : 'Simmetrik',
      title: isRu ? 'Симметричный семейный дом' : 'Simmetrik Oilaviy Uy',
      description: isRu
        ? 'Классический парадный фасад с центральным тамбуром и сбалансированным распределением комнат.'
        : 'Markaziy hashamatli dahliz va har ikki tomonga teng taqsimlangan simmetrik xonalar uyg‘unligi.',
      builder: buildSymmetricalLayout,
    },
    {
      id: 'var_corner_panorama',
      styleKey: 'modern',
      badgeText: isRu ? 'Панорама' : 'Burchakli Zal',
      title: isRu ? 'Угловая панорамная гостиная' : 'Burchakli Zal (Corner Panorama)',
      description: isRu
        ? 'Гостиная на углу дома с окнами на две стороны света. Максимальный обзор двора и простор.'
        : 'Uyning burchagida joylashgan katta zal. Ikki tomonga qaragan panoramali derazalar va ajoyib ko‘rinish.',
      builder: buildCornerPanoramaLayout,
    },
    {
      id: 'var_compact_european',
      styleKey: 'compact',
      badgeText: isRu ? 'Эко-Компакт' : 'Kompakt Yevropa',
      title: isRu ? 'Европейский компактный дом' : 'Kompakt Yevropa Uslubi',
      description: isRu
        ? 'Минимум коридоров, максимум полезной жилой площади. Идеальная экономия затрат на отопление и ремонт.'
        : 'Bekorchi yo‘laklarsiz 100% foydali maydon. Qurilish va isitish xarajatlarini tejovchi Yevropa standarti.',
      builder: buildCompactEuropeanLayout,
    },
    {
      id: 'var_culinary_hub',
      styleKey: 'hospitality',
      badgeText: isRu ? 'Гостеприимство' : 'Keng Oshxona',
      title: isRu ? 'Кулинарный хаб и гостевой зал' : 'Keng Oshxona-Mehmonxona',
      description: isRu
        ? 'Большая столовая-кухня для семейных трапез и приема гостей, соединенная с парадным залом.'
        : 'Mehmondo‘st oilalar uchun: katta dasturxonxona va oshxona rasmiy mehmonxona bilan keng bog‘langan.',
      builder: buildCulinaryHubLayout,
    },
    {
      id: 'var_utility_garage',
      styleKey: 'utility',
      badgeText: isRu ? 'С гаражом' : 'Garajli Blok',
      title: isRu ? 'Дом с интегрированным гаражом' : 'Garaj / Yordamchi Blokli',
      description: isRu
        ? 'Встроенный гараж или летняя кухня с прямым выходом во двор и буферным входом в жилую часть.'
        : 'Qulay garaj yoki yozgi oshxona bloki. Hovliga alohida chiqish va uy ichiga qulay dahliz orqali o‘tish yo‘lagi.',
      builder: buildUtilityGarageLayout,
    },
    {
      id: 'var_l_shape',
      styleKey: 'modern',
      badgeText: isRu ? 'L-образный' : 'L-Shaklli',
      title: isRu ? 'L-образная приватная планировка' : 'L-Shaklli Zamonaviy Reja',
      description: isRu
        ? 'Создает уютный защищенный от ветра внутренний дворик. Гостевое и жилое крылья четко разделены.'
        : 'Shamol va ko‘chadan himoyalangan xususiy ichki hovli hosil qiluvchi zamonaviy L-shaklli arxitektura.',
      builder: buildLShapeLayout,
    },
  ];

  const variants: GeneratedFloorplanVariant[] = [];

  for (const item of archetypesConfig) {
    try {
      // 1. Generate base architectural geometry
      const draft = item.builder(params);

      // 2. Perform automated T-Junction wall splitting for independent 3D room-by-room painting
      const splitResult = splitWallsAtIntersections(draft.walls, draft.openings, 0.18);

      // 3. Auto-furnish rooms with realistic starter 3D furniture
      const furnishResult = autoFurnishFloorplan(draft.rooms, splitResult.walls, []);

      // 4. Calculate rough budget
      const budget = calculateBudgetRange(totalAreaSqm);

      variants.push({
        id: item.id,
        title: item.title,
        styleKey: item.styleKey,
        badgeText: item.badgeText,
        description: item.description,
        width,
        depth,
        totalAreaSqm,
        estimatedCostMinUsd: budget.minUsd,
        estimatedCostMaxUsd: budget.maxUsd,
        roomCounts: draft.roomCounts,
        walls: splitResult.walls,
        openings: splitResult.openings,
        rooms: draft.rooms,
        furniture: furnishResult.newFurniture,
      });
    } catch (err) {
      console.error(`Failed to generate variant ${item.id}:`, err);
    }
  }

  return variants;
}
