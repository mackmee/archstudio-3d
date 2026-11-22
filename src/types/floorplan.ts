export interface Point2D {
  x: number; // in METERS
  y: number; // in METERS
}

export interface Wall {
  id: string;
  start: Point2D; // in meters
  end: Point2D;   // in meters
  thickness: number; // in meters (default 0.15m)
  materialLeftId?: string;  // Finish on +Z side
  materialRightId?: string; // Finish on -Z side
}

export type OpeningType = 'door' | 'window';

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  positionRatio: number; // 0 to 1 along the wall vector (start -> end)
  width: number; // in meters (default 0.9m for door, 1.4m for window)
  height: number; // in meters (default 2.1m for door, 1.4m for window)
  sillHeight: number; // in meters (0m for door, 0.9m for window)
  flip?: boolean; // door swing direction
}

export interface Room {
  id: string;
  name: string; // e.g., "Living Room", "Bedroom", "Kitchen"
  x: number; // in meters
  y: number; // in meters
  color?: string;
}

export interface PlacedFurniture {
  id: string;
  catalogId: string;
  name: string;
  position: [number, number, number]; // [x, y, z] in real-world METERS
  rotationY: number; // in radians
  scale: number; // multiplier (default 1.0)
  color?: string; // custom tint or fabric color
  customGlbUrl?: string; // object URL for user uploaded .glb / .gltf
  price: number; // USD
}

export interface BackgroundImage {
  url: string;
  opacity: number; // 0.0 to 1.0
  visible: boolean;
  width: number; // in pixels
  height: number; // in pixels
  x: number; // top-left offset X in meters (default 0)
  y: number; // top-left offset Y in meters (default 0)
  rotation?: number; // degrees
  widthMeters?: number; // physical width in meters
  heightMeters?: number; // physical height in meters
}

export type View2DMode = 'split' | 'overlay' | 'clean';

export type ToolType =
  | 'select'
  | 'pan'
  | 'calibrate'
  | 'wall'
  | 'door'
  | 'window'
  | 'room';

export type EditorMode = 'onboarding' | '2d' | '3d' | 'estimator';

export interface ProjectMetadata {
  projectName: string;
  targetAreaSqm?: number;
  numRooms?: number;
  isCalibrated: boolean;
}

export interface ReadinessChecklist {
  hasBlueprint: boolean;
  isCalibrated: boolean;
  hasWalls: boolean;
  hasOpenings: boolean;
  hasRooms: boolean;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  isReadyFor3D: boolean;
}

export type LightingPreset = 'day' | 'sunset' | 'night';
export type MarketPresetType = 'standard' | 'premium';

export interface View3DSettings {
  showCeiling: boolean;
  showRoomLabels: boolean;
  cameraMode: 'orbit' | 'walkthrough';
  lightingPreset: LightingPreset;
  cutawayMode: boolean;
  focusedRoomId: string | null;
}

export interface Selected3DTarget {
  type: 'wall' | 'floor' | 'ceiling' | 'furniture';
  id?: string; // wallId or furnitureId
  side?: 'left' | 'right' | 'both';
}

export interface ViewportTransform {
  x: number; // Pan offset X in screen pixels
  y: number; // Pan offset Y in screen pixels
  zoom: number; // Zoom multiplier (e.g. 1.0 = 100%)
}

export interface CalibrationState {
  pointA: Point2D | null;
  pointB: Point2D | null;
  isCalibrating: boolean;
  measuredDistanceMeters?: number;
}
