import { create } from 'zustand';
import {
  BackgroundImage,
  CalibrationState,
  EditorMode,
  LightingPreset,
  Opening,
  PlacedFurniture,
  Point2D,
  Room,
  Selected3DTarget,
  ToolType,
  View2DMode,
  View3DSettings,
  Wall,
  ProjectMetadata,
  ReadinessChecklist,
  MarketPresetType,
} from '@/types/floorplan';
import { distance } from '@/lib/geometry';
import { splitWallsAtIntersections } from '@/lib/wallGeometry';
import { getUzbekistanMarketPreset } from '@/lib/estimator';
import {
  DEFAULT_FLOOR_MATERIAL_ID,
  DEFAULT_CEILING_MATERIAL_ID,
  DEFAULT_WALL_MATERIAL_ID,
} from '@/data/materials';

interface ProjectState {
  projectName: string;
  targetAreaSqm?: number;
  numRooms?: number;
  isCalibrated: boolean;
  pixelsPerMeter: number;
  ceilingHeight: number;
  backgroundImage: BackgroundImage | null;
  walls: Wall[];
  openings: Opening[];
  rooms: Room[];
  furniture: PlacedFurniture[];
  floorMaterialId: string;
  ceilingMaterialId: string;
  // Estimator overrides & settings
  customMaterialPrices: Record<string, number>;
  customFurniturePrices: Record<string, number>;
  wasteFactor: number;
  includeLabor: boolean;
  laborRatePerSqm: number;
  includeDelivery: boolean;
  deliveryFee: number;
  view2DMode?: View2DMode;
}

interface FloorplanStore extends ProjectState {
  // App Mode (Onboarding / 2D / 3D / Estimator)
  currentMode: EditorMode;
  setCurrentMode: (mode: EditorMode) => void;

  // 2D View Mode (Split / Overlay / Clean)
  view2DMode: View2DMode;
  setView2DMode: (mode: View2DMode) => void;
  splitAllWallsAtIntersections: () => { wallsSplit: number; junctionsSnapped: number };

  // Project Metadata Actions
  setProjectMetadata: (partial: Partial<ProjectMetadata>) => void;
  getReadinessChecklist: () => ReadinessChecklist;

  // Estimator Actions
  setCustomMaterialPrice: (materialId: string, price: number) => void;
  setCustomFurniturePrice: (catalogId: string, price: number) => void;
  setWasteFactor: (factor: number) => void;
  setIncludeLabor: (include: boolean) => void;
  setLaborRatePerSqm: (rate: number) => void;
  setIncludeDelivery: (include: boolean) => void;
  setDeliveryFee: (fee: number) => void;
  applyUzbekistanMarketPreset: (preset: MarketPresetType) => void;
  resetPriceOverrides: () => void;

  // 3D View Settings & Selection
  view3dSettings: View3DSettings;
  selected3DTarget: Selected3DTarget | null;
  isTransformDragging: boolean;
  setIsTransformDragging: (isDragging: boolean) => void;
  setView3dSettings: (partial: Partial<View3DSettings>) => void;
  toggleCeiling3D: () => void;
  toggleRoomLabels3D: () => void;
  setCameraMode3D: (mode: 'orbit' | 'walkthrough') => void;
  setLightingPreset: (preset: LightingPreset) => void;
  toggleCutawayMode: () => void;
  setFocusedRoomId: (id: string | null) => void;
  setSelected3DTarget: (target: Selected3DTarget | null) => void;
  applyMaterialToRoom: (roomId: string, materialId: string) => void;

  // Furniture Actions
  addFurniture: (item: Omit<PlacedFurniture, 'id'>) => string;
  updateFurniture: (id: string, partial: Partial<PlacedFurniture>) => void;
  removeFurniture: (id: string) => void;
  duplicateFurniture: (id: string) => string | null;

  // Materials Actions
  setWallMaterial: (wallId: string, materialId: string, side: 'left' | 'right' | 'both') => void;
  applyMaterialToAllWalls: (materialId: string) => void;
  setFloorMaterial: (materialId: string) => void;
  setCeilingMaterial: (materialId: string) => void;

  // Active UI & Editor State
  activeTool: ToolType;
  selectedId: string | null;
  isOrthoSnapEnabled: boolean;
  showGrid: boolean;
  calibrationState: CalibrationState;

  // History Stack
  historyPast: ProjectState[];
  historyFuture: ProjectState[];

  // Actions
  setActiveTool: (tool: ToolType) => void;
  setSelectedId: (id: string | null) => void;
  setPixelsPerMeter: (ppm: number) => void;
  setCeilingHeight: (h: number) => void;
  setBackgroundImage: (bg: BackgroundImage | null) => void;
  updateBackgroundImage: (partial: Partial<BackgroundImage>) => void;

  // Walls
  addWall: (wall: Omit<Wall, 'id'>) => string;
  updateWall: (id: string, partial: Partial<Wall>) => void;
  deleteWall: (id: string) => void;

  // Openings
  addOpening: (opening: Omit<Opening, 'id'>) => string;
  updateOpening: (id: string, partial: Partial<Opening>) => void;
  deleteOpening: (id: string) => void;

  // Rooms
  addRoom: (room: Omit<Room, 'id'>) => string;
  updateRoom: (id: string, partial: Partial<Room>) => void;
  deleteRoom: (id: string) => void;

  // Generic selection delete
  deleteSelected: () => void;

  // Editor Toggles
  toggleOrthoSnap: () => void;
  toggleShowGrid: () => void;
  setOrthoSnap: (enabled: boolean) => void;
  setShowGrid: (show: boolean) => void;

  // Calibration
  setCalibrationPointA: (pt: Point2D | null) => void;
  setCalibrationPointB: (pt: Point2D | null) => void;
  cancelCalibration: () => void;
  applyCalibration: (realWorldLengthMeters: number) => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  resetProject: () => void;
  loadSamplePlan: () => void;

  // Cloud Project State & Actions
  currentProjectId: string | null;
  lastSavedAt: string | null;
  isSaving: boolean;
  setCurrentProjectId: (id: string | null) => void;
  setLastSavedAt: (timestamp: string | null) => void;
  setIsSaving: (saving: boolean) => void;
  loadProjectData: (project: { id: string; name: string; floorplan_data: Partial<ProjectState>; updated_at?: string }) => void;
  createNewProject: (name?: string) => void;
}

const MAX_HISTORY = 40;

const initialProjectState: ProjectState = {
  projectName: 'My 2-Bedroom Residence',
  targetAreaSqm: 84,
  numRooms: 2,
  isCalibrated: false,
  pixelsPerMeter: 60,
  ceilingHeight: 2.8,
  backgroundImage: null,
  walls: [],
  openings: [],
  rooms: [],
  furniture: [],
  floorMaterialId: DEFAULT_FLOOR_MATERIAL_ID,
  ceilingMaterialId: DEFAULT_CEILING_MATERIAL_ID,
  customMaterialPrices: {},
  customFurniturePrices: {},
  wasteFactor: 0.1,
  includeLabor: true,
  laborRatePerSqm: 25,
  includeDelivery: true,
  deliveryFee: 25,
  view2DMode: 'clean',
};

export const useFloorplanStore = create<FloorplanStore>((set, get) => {
  const pushHistory = () => {
    const {
      projectName,
      targetAreaSqm,
      numRooms,
      isCalibrated,
      pixelsPerMeter,
      ceilingHeight,
      backgroundImage,
      walls,
      openings,
      rooms,
      furniture,
      floorMaterialId,
      ceilingMaterialId,
      customMaterialPrices,
      customFurniturePrices,
      wasteFactor,
      includeLabor,
      laborRatePerSqm,
      includeDelivery,
      deliveryFee,
      view2DMode,
      historyPast,
    } = get();

    const snapshot: ProjectState = {
      projectName,
      targetAreaSqm,
      numRooms,
      isCalibrated,
      pixelsPerMeter,
      ceilingHeight,
      backgroundImage: backgroundImage ? { ...backgroundImage } : null,
      walls: walls.map((w) => ({ ...w, start: { ...w.start }, end: { ...w.end } })),
      openings: openings.map((o) => ({ ...o })),
      rooms: rooms.map((r) => ({ ...r })),
      furniture: furniture.map((f) => ({ ...f, position: [...f.position] as [number, number, number] })),
      floorMaterialId,
      ceilingMaterialId,
      customMaterialPrices: { ...customMaterialPrices },
      customFurniturePrices: { ...customFurniturePrices },
      wasteFactor,
      includeLabor,
      laborRatePerSqm,
      includeDelivery,
      deliveryFee,
      view2DMode,
    };

    set({
      historyPast: [...historyPast.slice(-MAX_HISTORY + 1), snapshot],
      historyFuture: [],
    });
  };

  return {
    ...initialProjectState,
    currentMode: 'onboarding',
    setCurrentMode: (mode) => set({ currentMode: mode }),

    view2DMode: 'clean',
    setView2DMode: (mode) => set({ view2DMode: mode }),

    splitAllWallsAtIntersections: () => {
      const { walls, openings } = get();
      pushHistory();
      const res = splitWallsAtIntersections(walls, openings, 0.15);
      set({
        walls: res.walls,
        openings: res.openings,
      });
      return { wallsSplit: res.splitCount, junctionsSnapped: res.snappedCount };
    },

    setProjectMetadata: (partial) =>
      set((s) => ({
        projectName: partial.projectName !== undefined ? partial.projectName : s.projectName,
        targetAreaSqm: partial.targetAreaSqm !== undefined ? partial.targetAreaSqm : s.targetAreaSqm,
        numRooms: partial.numRooms !== undefined ? partial.numRooms : s.numRooms,
        isCalibrated: partial.isCalibrated !== undefined ? partial.isCalibrated : s.isCalibrated,
      })),

    getReadinessChecklist: () => {
      const s = get();
      const hasBlueprint = Boolean(s.backgroundImage?.url);
      const isCalibrated = s.isCalibrated || s.pixelsPerMeter !== 60;
      const hasWalls = s.walls.length >= 3;
      const hasOpenings = s.openings.length >= 1;
      const hasRooms = s.rooms.length >= 1;

      const checks = [hasBlueprint, isCalibrated, hasWalls, hasOpenings, hasRooms];
      const completedCount = checks.filter(Boolean).length;
      const totalCount = 5;
      const progressPercent = Math.round((completedCount / totalCount) * 100);
      const isReadyFor3D = hasWalls; // Minimum 3 structural walls needed to generate 3D

      return {
        hasBlueprint,
        isCalibrated,
        hasWalls,
        hasOpenings,
        hasRooms,
        completedCount,
        totalCount,
        progressPercent,
        isReadyFor3D,
      };
    },

    // Estimator Actions
    setCustomMaterialPrice: (materialId, price) =>
      set((s) => ({ customMaterialPrices: { ...s.customMaterialPrices, [materialId]: price } })),
    setCustomFurniturePrice: (catalogId, price) =>
      set((s) => ({ customFurniturePrices: { ...s.customFurniturePrices, [catalogId]: price } })),
    setWasteFactor: (factor) => set({ wasteFactor: factor }),
    setIncludeLabor: (include) => set({ includeLabor: include }),
    setLaborRatePerSqm: (rate) => set({ laborRatePerSqm: rate }),
    setIncludeDelivery: (include) => set({ includeDelivery: include }),
    setDeliveryFee: (fee) => set({ deliveryFee: fee }),
    applyUzbekistanMarketPreset: (preset) => {
      pushHistory();
      const data = getUzbekistanMarketPreset(preset);
      set((s) => ({
        customMaterialPrices: {
          ...s.customMaterialPrices,
          ...data.materialPrices,
        },
        laborRatePerSqm: data.laborRatePerSqm,
        deliveryFee: data.deliveryFee,
      }));
    },
    resetPriceOverrides: () => set({ customMaterialPrices: {}, customFurniturePrices: {} }),

    view3dSettings: {
      showCeiling: false,
      showRoomLabels: true,
      cameraMode: 'orbit',
      lightingPreset: 'day',
      cutawayMode: false,
      focusedRoomId: null,
    },
    selected3DTarget: null,
    isTransformDragging: false,
    setIsTransformDragging: (isDragging) => set({ isTransformDragging: isDragging }),

    setView3dSettings: (partial) =>
      set((s) => ({ view3dSettings: { ...s.view3dSettings, ...partial } })),
    toggleCeiling3D: () =>
      set((s) => ({
        view3dSettings: { ...s.view3dSettings, showCeiling: !s.view3dSettings.showCeiling },
      })),
    toggleRoomLabels3D: () =>
      set((s) => ({
        view3dSettings: {
          ...s.view3dSettings,
          showRoomLabels: !s.view3dSettings.showRoomLabels,
        },
      })),
    setCameraMode3D: (mode) =>
      set((s) => ({
        view3dSettings: { ...s.view3dSettings, cameraMode: mode },
      })),
    setLightingPreset: (preset) =>
      set((s) => ({
        view3dSettings: { ...s.view3dSettings, lightingPreset: preset },
      })),
    toggleCutawayMode: () =>
      set((s) => ({
        view3dSettings: { ...s.view3dSettings, cutawayMode: !s.view3dSettings.cutawayMode },
      })),
    setFocusedRoomId: (id) =>
      set((s) => ({
        view3dSettings: { ...s.view3dSettings, focusedRoomId: id },
      })),
    setSelected3DTarget: (target) => set({ selected3DTarget: target }),

    applyMaterialToRoom: (roomId, materialId) => {
      pushHistory();
      const state = get();
      const room = state.rooms.find((r) => r.id === roomId);
      if (!room) return;

      const updatedWalls = state.walls.map((wall) => {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 0.001) return wall;

        const t = Math.max(0, Math.min(1, ((room.x - wall.start.x) * dx + (room.y - wall.start.y) * dy) / lenSq));
        const projX = wall.start.x + t * dx;
        const projY = wall.start.y + t * dy;
        const dist = Math.hypot(room.x - projX, room.y - projY);

        if (dist <= 5.5) {
          const nLeftX = -dy;
          const nLeftY = dx;
          const toRoomX = room.x - wall.start.x;
          const toRoomY = room.y - wall.start.y;
          const sideDot = toRoomX * nLeftX + toRoomY * nLeftY;

          if (sideDot >= 0) {
            return { ...wall, materialLeftId: materialId };
          } else {
            return { ...wall, materialRightId: materialId };
          }
        }
        return wall;
      });

      set({ walls: updatedWalls });
    },

    // Furniture Actions
    addFurniture: (item) => {
      pushHistory();
      const id = `furn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newFurniture: PlacedFurniture = { ...item, id };
      set((state) => ({
        furniture: [...state.furniture, newFurniture],
        selected3DTarget: { type: 'furniture', id },
      }));
      return id;
    },

    updateFurniture: (id, partial) => {
      set((state) => ({
        furniture: state.furniture.map((f) => (f.id === id ? { ...f, ...partial } : f)),
      }));
    },

    removeFurniture: (id) => {
      pushHistory();
      set((state) => ({
        furniture: state.furniture.filter((f) => f.id !== id),
        selected3DTarget:
          state.selected3DTarget?.type === 'furniture' && state.selected3DTarget.id === id
            ? null
            : state.selected3DTarget,
      }));
    },

    duplicateFurniture: (id) => {
      const item = get().furniture.find((f) => f.id === id);
      if (!item) return null;
      pushHistory();
      const newId = `furn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const duplicated: PlacedFurniture = {
        ...item,
        id: newId,
        position: [item.position[0] + 0.5, item.position[1], item.position[2] + 0.5],
      };
      set((state) => ({
        furniture: [...state.furniture, duplicated],
        selected3DTarget: { type: 'furniture', id: newId },
      }));
      return newId;
    },

    // Materials Actions
    setWallMaterial: (wallId, materialId, side) => {
      pushHistory();
      set((state) => ({
        walls: state.walls.map((w) => {
          if (w.id !== wallId) return w;
          if (side === 'left') {
            return { ...w, materialLeftId: materialId };
          } else if (side === 'right') {
            return { ...w, materialRightId: materialId };
          } else {
            return { ...w, materialLeftId: materialId, materialRightId: materialId };
          }
        }),
      }));
    },

    applyMaterialToAllWalls: (materialId) => {
      pushHistory();
      set((state) => ({
        walls: state.walls.map((w) => ({
          ...w,
          materialLeftId: materialId,
          materialRightId: materialId,
        })),
      }));
    },

    setFloorMaterial: (materialId) => {
      pushHistory();
      set({ floorMaterialId: materialId });
    },

    setCeilingMaterial: (materialId) => {
      pushHistory();
      set({ ceilingMaterialId: materialId });
    },

    activeTool: 'select',
    selectedId: null,
    isOrthoSnapEnabled: true,
    showGrid: true,
    calibrationState: {
      pointA: null,
      pointB: null,
      isCalibrating: false,
    },
    historyPast: [],
    historyFuture: [],

    setActiveTool: (tool) => {
      if (tool !== 'calibrate') {
        set({
          activeTool: tool,
          calibrationState: { pointA: null, pointB: null, isCalibrating: false },
        });
      } else {
        set({
          activeTool: tool,
          selectedId: null,
          calibrationState: { pointA: null, pointB: null, isCalibrating: true },
        });
      }
    },

    setSelectedId: (id) => set({ selectedId: id }),

    setPixelsPerMeter: (ppm) => {
      pushHistory();
      set({ pixelsPerMeter: Math.max(10, Math.min(500, ppm)) });
    },

    setCeilingHeight: (h) => {
      pushHistory();
      set({ ceilingHeight: Math.max(1.8, Math.min(8.0, h)) });
    },

    setBackgroundImage: (bg) => {
      pushHistory();
      set({ backgroundImage: bg });
    },

    updateBackgroundImage: (partial) => {
      const current = get().backgroundImage;
      if (!current) return;
      pushHistory();
      set({
        backgroundImage: {
          ...current,
          ...partial,
        },
      });
    },

    // Walls
    addWall: (wallData) => {
      pushHistory();
      const id = `wall_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newWall: Wall = {
        ...wallData,
        id,
        materialLeftId: wallData.materialLeftId || DEFAULT_WALL_MATERIAL_ID,
        materialRightId: wallData.materialRightId || DEFAULT_WALL_MATERIAL_ID,
      };
      set((state) => ({
        walls: [...state.walls, newWall],
        selectedId: id,
      }));
      return id;
    },

    updateWall: (id, partial) => {
      pushHistory();
      set((state) => ({
        walls: state.walls.map((w) => (w.id === id ? { ...w, ...partial } : w)),
      }));
    },

    deleteWall: (id) => {
      pushHistory();
      set((state) => ({
        walls: state.walls.filter((w) => w.id !== id),
        openings: state.openings.filter((o) => o.wallId !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        selected3DTarget:
          state.selected3DTarget?.id === id ? null : state.selected3DTarget,
      }));
    },

    // Openings
    addOpening: (openingData) => {
      pushHistory();
      const id = `opening_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newOpening: Opening = { ...openingData, id };
      set((state) => ({
        openings: [...state.openings, newOpening],
        selectedId: id,
      }));
      return id;
    },

    updateOpening: (id, partial) => {
      pushHistory();
      set((state) => ({
        openings: state.openings.map((o) => (o.id === id ? { ...o, ...partial } : o)),
      }));
    },

    deleteOpening: (id) => {
      pushHistory();
      set((state) => ({
        openings: state.openings.filter((o) => o.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      }));
    },

    // Rooms
    addRoom: (roomData) => {
      pushHistory();
      const id = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newRoom: Room = { ...roomData, id };
      set((state) => ({
        rooms: [...state.rooms, newRoom],
        selectedId: id,
      }));
      return id;
    },

    updateRoom: (id, partial) => {
      pushHistory();
      set((state) => ({
        rooms: state.rooms.map((r) => (r.id === id ? { ...r, ...partial } : r)),
      }));
    },

    deleteRoom: (id) => {
      pushHistory();
      set((state) => ({
        rooms: state.rooms.filter((r) => r.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      }));
    },

    deleteSelected: () => {
      const { selectedId, walls, openings, rooms, selected3DTarget } = get();
      if (selected3DTarget?.type === 'furniture' && selected3DTarget.id) {
        get().removeFurniture(selected3DTarget.id);
        return;
      }
      if (!selectedId) return;

      if (walls.some((w) => w.id === selectedId)) {
        get().deleteWall(selectedId);
      } else if (openings.some((o) => o.id === selectedId)) {
        get().deleteOpening(selectedId);
      } else if (rooms.some((r) => r.id === selectedId)) {
        get().deleteRoom(selectedId);
      }
    },

    // Toggles
    toggleOrthoSnap: () => set((s) => ({ isOrthoSnapEnabled: !s.isOrthoSnapEnabled })),
    toggleShowGrid: () => set((s) => ({ showGrid: !s.showGrid })),
    setOrthoSnap: (enabled) => set({ isOrthoSnapEnabled: enabled }),
    setShowGrid: (show) => set({ showGrid: show }),

    // Calibration
    setCalibrationPointA: (pt) => {
      set((s) => ({
        calibrationState: { ...s.calibrationState, pointA: pt, isCalibrating: true },
      }));
    },

    setCalibrationPointB: (pt) => {
      const { calibrationState } = get();
      if (!calibrationState.pointA || !pt) {
        set((s) => ({
          calibrationState: { ...s.calibrationState, pointB: pt },
        }));
        return;
      }
      const dist = distance(calibrationState.pointA, pt);
      set((s) => ({
        calibrationState: {
          ...s.calibrationState,
          pointB: pt,
          measuredDistanceMeters: dist,
        },
      }));
    },

    cancelCalibration: () => {
      set({
        calibrationState: { pointA: null, pointB: null, isCalibrating: false },
        activeTool: 'select',
      });
    },

    applyCalibration: (realWorldLengthMeters) => {
      const { calibrationState, pixelsPerMeter } = get();
      if (!calibrationState.pointA || !calibrationState.pointB || realWorldLengthMeters <= 0) {
        return;
      }

      const currentMeters = distance(calibrationState.pointA, calibrationState.pointB);
      const pixelLength = currentMeters * pixelsPerMeter;
      const newPixelsPerMeter = Math.max(10, Math.min(500, pixelLength / realWorldLengthMeters));

      pushHistory();
      set({
        pixelsPerMeter: Math.round(newPixelsPerMeter * 10) / 10,
        isCalibrated: true,
        calibrationState: { pointA: null, pointB: null, isCalibrating: false },
        activeTool: 'select',
      });
    },

    // Undo / Redo
    undo: () => {
      const { historyPast, historyFuture } = get();
      if (historyPast.length === 0) return;

      const previous = historyPast[historyPast.length - 1];
      const newPast = historyPast.slice(0, -1);

      const currentSnapshot: ProjectState = {
        projectName: get().projectName,
        targetAreaSqm: get().targetAreaSqm,
        numRooms: get().numRooms,
        isCalibrated: get().isCalibrated,
        pixelsPerMeter: get().pixelsPerMeter,
        ceilingHeight: get().ceilingHeight,
        backgroundImage: get().backgroundImage,
        walls: get().walls,
        openings: get().openings,
        rooms: get().rooms,
        furniture: get().furniture,
        floorMaterialId: get().floorMaterialId,
        ceilingMaterialId: get().ceilingMaterialId,
        customMaterialPrices: { ...get().customMaterialPrices },
        customFurniturePrices: { ...get().customFurniturePrices },
        wasteFactor: get().wasteFactor,
        includeLabor: get().includeLabor,
        laborRatePerSqm: get().laborRatePerSqm,
        includeDelivery: get().includeDelivery,
        deliveryFee: get().deliveryFee,
      };

      set({
        ...previous,
        historyPast: newPast,
        historyFuture: [currentSnapshot, ...historyFuture],
        selectedId: null,
        selected3DTarget: null,
      });
    },

    redo: () => {
      const { historyPast, historyFuture } = get();
      if (historyFuture.length === 0) return;

      const next = historyFuture[0];
      const newFuture = historyFuture.slice(1);

      const currentSnapshot: ProjectState = {
        projectName: get().projectName,
        targetAreaSqm: get().targetAreaSqm,
        numRooms: get().numRooms,
        isCalibrated: get().isCalibrated,
        pixelsPerMeter: get().pixelsPerMeter,
        ceilingHeight: get().ceilingHeight,
        backgroundImage: get().backgroundImage,
        walls: get().walls,
        openings: get().openings,
        rooms: get().rooms,
        furniture: get().furniture,
        floorMaterialId: get().floorMaterialId,
        ceilingMaterialId: get().ceilingMaterialId,
        customMaterialPrices: { ...get().customMaterialPrices },
        customFurniturePrices: { ...get().customFurniturePrices },
        wasteFactor: get().wasteFactor,
        includeLabor: get().includeLabor,
        laborRatePerSqm: get().laborRatePerSqm,
        includeDelivery: get().includeDelivery,
        deliveryFee: get().deliveryFee,
      };

      set({
        ...next,
        historyPast: [...historyPast, currentSnapshot],
        historyFuture: newFuture,
        selectedId: null,
        selected3DTarget: null,
      });
    },

    resetProject: () => {
      pushHistory();
      set({
        ...initialProjectState,
        selectedId: null,
        selected3DTarget: null,
        activeTool: 'select',
        calibrationState: { pointA: null, pointB: null, isCalibrating: false },
      });
    },

    loadSamplePlan: () => {
      pushHistory();
      const sampleWalls: Wall[] = [
        {
          id: 'w1',
          start: { x: 0, y: 0 },
          end: { x: 8, y: 0 },
          thickness: 0.2,
          materialLeftId: 'wp_linen_beige',
          materialRightId: 'paint_pure_white',
        },
        {
          id: 'w2',
          start: { x: 8, y: 0 },
          end: { x: 8, y: 6 },
          thickness: 0.2,
          materialLeftId: 'wp_vertical_stripes',
          materialRightId: 'paint_pure_white',
        },
        {
          id: 'w3',
          start: { x: 8, y: 6 },
          end: { x: 0, y: 6 },
          thickness: 0.2,
          materialLeftId: 'paint_soft_sage',
          materialRightId: 'paint_pure_white',
        },
        {
          id: 'w4',
          start: { x: 0, y: 6 },
          end: { x: 0, y: 0 },
          thickness: 0.2,
          materialLeftId: 'wp_exposed_brick',
          materialRightId: 'paint_pure_white',
        },
        {
          id: 'w5',
          start: { x: 4.5, y: 0 },
          end: { x: 4.5, y: 6 },
          thickness: 0.15,
          materialLeftId: 'wp_acoustic_slats',
          materialRightId: 'paint_warm_greige',
        },
        {
          id: 'w6',
          start: { x: 4.5, y: 3 },
          end: { x: 8, y: 3 },
          thickness: 0.15,
          materialLeftId: 'wp_venetian_plaster',
          materialRightId: 'paint_terracotta',
        },
        {
          id: 'w7',
          start: { x: 0, y: 4 },
          end: { x: 2.2, y: 4 },
          thickness: 0.15,
          materialLeftId: 'paint_midnight_navy',
          materialRightId: 'paint_warm_greige',
        },
        {
          id: 'w8',
          start: { x: 2.2, y: 4 },
          end: { x: 2.2, y: 6 },
          thickness: 0.15,
          materialLeftId: 'paint_midnight_navy',
          materialRightId: 'paint_pure_white',
        },
      ];

      const sampleOpenings: Opening[] = [
        { id: 'op1', wallId: 'w4', type: 'door', positionRatio: 0.25, width: 0.9, height: 2.1, sillHeight: 0, flip: false },
        { id: 'op2', wallId: 'w1', type: 'window', positionRatio: 0.35, width: 1.6, height: 1.4, sillHeight: 0.9 },
        { id: 'op3', wallId: 'w5', type: 'door', positionRatio: 0.25, width: 0.85, height: 2.1, sillHeight: 0, flip: true },
        { id: 'op4', wallId: 'w2', type: 'window', positionRatio: 0.25, width: 1.4, height: 1.4, sillHeight: 0.9 },
        { id: 'op5', wallId: 'w5', type: 'door', positionRatio: 0.75, width: 0.85, height: 2.1, sillHeight: 0, flip: false },
        { id: 'op6', wallId: 'w2', type: 'window', positionRatio: 0.75, width: 1.4, height: 1.4, sillHeight: 0.9 },
        { id: 'op7', wallId: 'w7', type: 'door', positionRatio: 0.55, width: 0.75, height: 2.1, sillHeight: 0, flip: true },
      ];

      const sampleRooms: Room[] = [
        { id: 'r1', name: 'Living & Dining', x: 2.2, y: 2.0 },
        { id: 'r2', name: 'Master Bedroom', x: 6.2, y: 1.5 },
        { id: 'r3', name: 'Guest Bedroom', x: 6.2, y: 4.5 },
        { id: 'r4', name: 'Bathroom', x: 1.1, y: 5.0 },
      ];

      const sampleFurniture: PlacedFurniture[] = [
        // Living room sofa, coffee table, TV console, lamp
        {
          id: 'furn_demo_sofa',
          catalogId: 'furn_sofa_3seater',
          name: 'Modern 3-Seater Sofa',
          position: [2.2, 0, 1.4],
          rotationY: 0,
          scale: 1,
          color: '#475569',
          price: 850,
        },
        {
          id: 'furn_demo_table',
          catalogId: 'furn_coffee_table',
          name: 'Minimalist Coffee Table',
          position: [2.2, 0, 2.3],
          rotationY: 0,
          scale: 1,
          color: '#78350f',
          price: 240,
        },
        {
          id: 'furn_demo_tv',
          catalogId: 'furn_tv_console',
          name: 'Media Console & 65" TV',
          position: [2.2, 0, 3.7],
          rotationY: Math.PI,
          scale: 1,
          color: '#1e293b',
          price: 1100,
        },
        {
          id: 'furn_demo_plant',
          catalogId: 'furn_potted_plant',
          name: 'Monstera in Ceramic Pot',
          position: [0.6, 0, 0.6],
          rotationY: 0,
          scale: 1,
          color: '#15803d',
          price: 85,
        },
        // Living room window curtains
        {
          id: 'furn_demo_curtains',
          catalogId: 'furn_curtains_pleated',
          name: 'Floor-to-Ceiling Curtains',
          position: [2.8, 0, 0.15],
          rotationY: 0,
          scale: 1,
          color: '#fef3c7',
          price: 280,
        },
        // Master Bedroom Bed & Nightstand
        {
          id: 'furn_demo_bed',
          catalogId: 'furn_bed_queen',
          name: 'Queen Bed with Headboard',
          position: [6.2, 0, 1.3],
          rotationY: Math.PI / 2,
          scale: 1,
          color: '#f1f5f9',
          price: 1250,
        },
        {
          id: 'furn_demo_nightstand',
          catalogId: 'furn_nightstand',
          name: 'Floating Bedside Nightstand',
          position: [6.2, 0, 2.45],
          rotationY: Math.PI / 2,
          scale: 1,
          color: '#451a03',
          price: 160,
        },
      ];

      set({
        projectName: 'Sample 84 m² Apartment',
        targetAreaSqm: 84,
        numRooms: 2,
        isCalibrated: true,
        currentMode: '2d',
        pixelsPerMeter: 60,
        ceilingHeight: 2.8,
        floorMaterialId: 'floor_natural_oak',
        ceilingMaterialId: 'ceil_matte_white',
        walls: sampleWalls,
        openings: sampleOpenings,
        rooms: sampleRooms,
        furniture: sampleFurniture,
        customMaterialPrices: {},
        customFurniturePrices: {},
        wasteFactor: 0.1,
        includeLabor: true,
        laborRatePerSqm: 25,
        selectedId: null,
        selected3DTarget: null,
      });
    },

    // Cloud Project State & Actions
    currentProjectId: null,
    lastSavedAt: null,
    isSaving: false,

    setCurrentProjectId: (id) => set({ currentProjectId: id }),
    setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),
    setIsSaving: (saving) => set({ isSaving: saving }),

    loadProjectData: ({ id, name, floorplan_data, updated_at }) => {
      set({
        currentProjectId: id,
        lastSavedAt: updated_at || new Date().toISOString(),
        projectName: name || floorplan_data?.projectName || 'Project',
        targetAreaSqm: floorplan_data?.targetAreaSqm ?? 84,
        numRooms: floorplan_data?.numRooms ?? 2,
        isCalibrated: floorplan_data?.isCalibrated ?? true,
        pixelsPerMeter: floorplan_data?.pixelsPerMeter ?? 60,
        ceilingHeight: floorplan_data?.ceilingHeight ?? 2.8,
        backgroundImage: floorplan_data?.backgroundImage ?? null,
        walls: floorplan_data?.walls ?? [],
        openings: floorplan_data?.openings ?? [],
        rooms: floorplan_data?.rooms ?? [],
        furniture: floorplan_data?.furniture ?? [],
        floorMaterialId: floorplan_data?.floorMaterialId ?? DEFAULT_FLOOR_MATERIAL_ID,
        ceilingMaterialId: floorplan_data?.ceilingMaterialId ?? DEFAULT_CEILING_MATERIAL_ID,
        customMaterialPrices: floorplan_data?.customMaterialPrices ?? {},
        customFurniturePrices: floorplan_data?.customFurniturePrices ?? {},
        wasteFactor: floorplan_data?.wasteFactor ?? 0.1,
        includeLabor: floorplan_data?.includeLabor ?? true,
        laborRatePerSqm: floorplan_data?.laborRatePerSqm ?? 25,
        includeDelivery: floorplan_data?.includeDelivery ?? true,
        deliveryFee: floorplan_data?.deliveryFee ?? 25,
        selectedId: null,
        selected3DTarget: null,
        currentMode: (floorplan_data?.walls && floorplan_data.walls.length >= 3) ? '2d' : 'onboarding',
        historyPast: [],
        historyFuture: [],
      });
    },

    createNewProject: (name) => {
      set({
        ...initialProjectState,
        projectName: name || 'New Architecture Project',
        currentProjectId: null,
        lastSavedAt: null,
        isSaving: false,
        selectedId: null,
        selected3DTarget: null,
        currentMode: 'onboarding',
        historyPast: [],
        historyFuture: [],
      });
    },
  };
});
