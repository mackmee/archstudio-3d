'use client';

import React, { useState, useRef } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import {
  MaterialCategory,
  MaterialItem,
  getMaterialsByCategory,
} from '@/data/materials';
import {
  FurnitureCategory,
  FURNITURE_CATALOG,
  getFurnitureByCategory,
} from '@/data/furniture';
import { distance, formatMeters } from '@/lib/geometry';
import {
  Palette,
  Armchair,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Square,
  HelpCircle,
  Plus,
  Upload,
  RotateCw,
  Copy,
  Trash2,
} from 'lucide-react';

export const DesignSidebar: React.FC = () => {
  const {
    walls,
    rooms,
    selected3DTarget,
    setWallMaterial,
    applyMaterialToAllWalls,
    floorMaterialId,
    setFloorMaterial,
    ceilingMaterialId,
    setCeilingMaterial,
    furniture,
    addFurniture,
    updateFurniture,
    removeFurniture,
    duplicateFurniture,
  } = useFloorplanStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'materials' | 'furniture'>('materials');

  // Materials Sub-state
  const [activeCategory, setActiveCategory] = useState<MaterialCategory>('wallpaper');
  const [wallSide, setWallSide] = useState<'both' | 'left' | 'right'>('both');
  const [prevTargetType, setPrevTargetType] = useState<string | undefined>(selected3DTarget?.type);

  // Furniture Sub-state
  const [furnitureCategory, setFurnitureCategory] = useState<FurnitureCategory | 'all'>('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-switch tabs when 3D selection changes
  if (selected3DTarget?.type !== prevTargetType) {
    setPrevTargetType(selected3DTarget?.type);

    if (selected3DTarget?.type === 'furniture') {
      setActiveTab('furniture');
    } else if (
      selected3DTarget?.type === 'wall' ||
      selected3DTarget?.type === 'floor' ||
      selected3DTarget?.type === 'ceiling'
    ) {
      setActiveTab('materials');
      if (selected3DTarget.type === 'floor') {
        setActiveCategory('flooring');
      } else if (selected3DTarget.type === 'ceiling') {
        setActiveCategory('ceiling');
      } else if (
        selected3DTarget.type === 'wall' &&
        (activeCategory === 'flooring' || activeCategory === 'ceiling')
      ) {
        setActiveCategory('wallpaper');
      }
    }
  }

  // Selected Wall details
  const selectedWall =
    selected3DTarget?.type === 'wall'
      ? walls.find((w) => w.id === selected3DTarget.id)
      : null;

  const currentWallLength = selectedWall
    ? formatMeters(distance(selectedWall.start, selectedWall.end))
    : null;

  // Selected Furniture details
  const selectedFurniture =
    selected3DTarget?.type === 'furniture'
      ? furniture.find((f) => f.id === selected3DTarget.id)
      : null;

  // Active material ID for current selection
  const currentActiveMaterialId = React.useMemo(() => {
    if (selected3DTarget?.type === 'floor') return floorMaterialId;
    if (selected3DTarget?.type === 'ceiling') return ceilingMaterialId;
    if (selectedWall) {
      if (wallSide === 'left') return selectedWall.materialLeftId;
      if (wallSide === 'right') return selectedWall.materialRightId;
      return selectedWall.materialLeftId || selectedWall.materialRightId;
    }
    return null;
  }, [selected3DTarget, selectedWall, wallSide, floorMaterialId, ceilingMaterialId]);

  const handleSelectMaterial = (item: MaterialItem) => {
    if (selected3DTarget?.type === 'wall' && selectedWall) {
      setWallMaterial(selectedWall.id, item.id, wallSide);
    } else if (selected3DTarget?.type === 'floor') {
      setFloorMaterial(item.id);
    } else if (selected3DTarget?.type === 'ceiling') {
      setCeilingMaterial(item.id);
    } else {
      // Global apply
      if (item.category === 'wallpaper' || item.category === 'paint') {
        applyMaterialToAllWalls(item.id);
      } else if (item.category === 'flooring') {
        setFloorMaterial(item.id);
      } else if (item.category === 'ceiling') {
        setCeilingMaterial(item.id);
      }
    }
  };

  const handlePlaceFurniture = (catItem: typeof FURNITURE_CATALOG[0]) => {
    // Default placement: center of first room, or center of floorplan
    let px = 3.5, pz = 3.0;
    if (rooms.length > 0) {
      px = rooms[0].x;
      pz = rooms[0].y;
    } else if (walls.length > 0) {
      px = walls[0].start.x + 1.0;
      pz = walls[0].start.y + 1.0;
    }

    addFurniture({
      catalogId: catItem.id,
      name: catItem.name,
      position: [px, 0, pz],
      rotationY: 0,
      scale: 1,
      color: catItem.defaultColor,
      price: catItem.price,
    });
  };

  const handleCustomGlbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const fileName = file.name.replace(/\.[^/.]+$/, '');

    let px = 3.5, pz = 3.0;
    if (rooms.length > 0) {
      px = rooms[0].x;
      pz = rooms[0].y;
    }

    addFurniture({
      catalogId: 'custom_glb',
      name: fileName || 'Custom 3D Model',
      position: [px, 0, pz],
      rotationY: 0,
      scale: 1,
      customGlbUrl: url,
      price: 150,
    });

    e.target.value = '';
  };

  const categories: { id: MaterialCategory; label: string }[] = [
    { id: 'wallpaper', label: 'Wallpaper' },
    { id: 'paint', label: 'Paint' },
    { id: 'flooring', label: 'Flooring' },
    { id: 'ceiling', label: 'Ceiling' },
  ];

  const furnitureCategories: { id: FurnitureCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'living', label: 'Living' },
    { id: 'bedroom', label: 'Bedroom' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'curtains', label: 'Curtains' },
    { id: 'decor', label: 'Decor' },
  ];

  const categoryMaterials = getMaterialsByCategory(activeCategory);
  const filteredFurniture = getFurnitureByCategory(furnitureCategory);

  const fabricColorPresets = [
    '#475569',
    '#78350f',
    '#1e293b',
    '#d97706',
    '#f1f5f9',
    '#15803d',
    '#c27156',
    '#0f172a',
  ];

  return (
    <div
      className={`absolute right-0 top-0 bottom-0 z-20 flex transition-transform duration-300 ${
        isCollapsed ? 'translate-x-[calc(100%-2.5rem)]' : 'translate-x-0'
      }`}
    >
      {/* Hidden GLB File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        className="hidden"
        onChange={handleCustomGlbUpload}
      />

      {/* Collapse / Expand Toggle Button */}
      <div className="flex items-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-14 w-8 rounded-l-xl bg-slate-900/95 border-l border-t border-b border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center shadow-xl backdrop-blur-md transition hover:bg-slate-800"
          title={isCollapsed ? 'Expand Design Studio' : 'Collapse Design Studio'}
        >
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Studio Sidebar Panel */}
      <aside className="w-84 h-full bg-slate-900/95 border-l border-slate-800 backdrop-blur-xl flex flex-col text-slate-200 select-none shadow-2xl">
        {/* Top Switcher Tabs: Materials vs Furniture */}
        <div className="h-13 border-b border-slate-800 px-3 flex items-center gap-1.5 bg-slate-950/70 shrink-0">
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'materials'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Materials</span>
          </button>

          <button
            onClick={() => setActiveTab('furniture')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'furniture'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Armchair className="w-3.5 h-3.5 text-amber-400" />
            <span>Furniture</span>
            {furniture.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                {furniture.length}
              </span>
            )}
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: MATERIALS STUDIO (Stage 3) */}
        {/* ============================================================ */}
        {activeTab === 'materials' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Target Inspector Card */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-950/60 shrink-0 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Square className="w-3.5 h-3.5 text-cyan-400" />
                  Target Surface:
                </span>
                <span className="font-semibold text-white font-mono">
                  {selectedWall
                    ? `Wall (${currentWallLength})`
                    : selected3DTarget?.type === 'floor'
                    ? 'Floor Slab'
                    : selected3DTarget?.type === 'ceiling'
                    ? 'Ceiling Slab'
                    : 'All Walls'}
                </span>
              </div>

              {selectedWall ? (
                <div className="space-y-2">
                  <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px]">
                    <button
                      onClick={() => setWallSide('both')}
                      className={`flex-1 py-1 rounded-md font-medium transition ${
                        wallSide === 'both'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Both Sides
                    </button>
                    <button
                      onClick={() => setWallSide('left')}
                      className={`flex-1 py-1 rounded-md font-medium transition ${
                        wallSide === 'left'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Side A (+Z Face)"
                    >
                      Side A
                    </button>
                    <button
                      onClick={() => setWallSide('right')}
                      className={`flex-1 py-1 rounded-md font-medium transition ${
                        wallSide === 'right'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Side B (-Z Face)"
                    >
                      Side B
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const currentMatId =
                        selectedWall.materialLeftId || selectedWall.materialRightId;
                      if (currentMatId) applyMaterialToAllWalls(currentMatId);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply This to All Walls</span>
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Click any wall, floor, or ceiling in 3D to customize it.</span>
                </div>
              )}
            </div>

            {/* Category Tabs */}
            <div className="grid grid-cols-4 p-2 gap-1 border-b border-slate-800 bg-slate-950/40 shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`py-1.5 text-[11px] font-semibold rounded-lg transition ${
                    activeCategory === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Visual Swatch Grid */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {categoryMaterials.map((item) => {
                const isCurrent = currentActiveMaterialId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectMaterial(item)}
                    className={`group cursor-pointer rounded-xl p-2.5 border transition-all duration-150 flex items-center gap-3 ${
                      isCurrent
                        ? 'bg-cyan-950/30 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/50 hover:bg-slate-800/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-lg border border-slate-700/80 shadow-inner shrink-0 relative overflow-hidden"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.secondaryColor && (
                        <div
                          className="absolute inset-0 opacity-40"
                          style={{
                            backgroundImage:
                              item.pattern === 'stripes'
                                ? `repeating-linear-gradient(90deg, ${item.secondaryColor}, ${item.secondaryColor} 4px, transparent 4px, transparent 8px)`
                                : item.pattern === 'brick'
                                ? `repeating-linear-gradient(0deg, ${item.secondaryColor}, ${item.secondaryColor} 2px, transparent 2px, transparent 8px)`
                                : item.pattern === 'wood_planks'
                                ? `repeating-linear-gradient(0deg, ${item.secondaryColor}, ${item.secondaryColor} 3px, transparent 3px, transparent 12px)`
                                : item.pattern === 'herringbone'
                                ? `repeating-linear-gradient(45deg, ${item.secondaryColor}, ${item.secondaryColor} 4px, transparent 4px, transparent 10px)`
                                : `radial-gradient(circle, ${item.secondaryColor} 20%, transparent 20%)`,
                            backgroundSize: '12px 12px',
                          }}
                        />
                      )}

                      {isCurrent && (
                        <div className="absolute inset-0 bg-cyan-500/25 flex items-center justify-center text-white">
                          <Check className="w-5 h-5 drop-shadow" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {item.description || `${item.pattern || 'solid'} finish`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-amber-400 font-semibold">
                          ${item.pricePerUnit.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-slate-500">/ {item.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Apartment Theme Presets Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/80 shrink-0 space-y-1.5">
              <span className="text-[11px] text-slate-400 font-semibold block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Style Presets:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => {
                    applyMaterialToAllWalls('wp_linen_beige');
                    setFloorMaterial('floor_natural_oak');
                    setCeilingMaterial('ceil_matte_white');
                  }}
                  className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-800 hover:border-slate-700 transition text-center"
                >
                  Scandi Oak
                </button>
                <button
                  onClick={() => {
                    applyMaterialToAllWalls('wp_exposed_brick');
                    setFloorMaterial('floor_light_concrete');
                    setCeilingMaterial('ceil_recessed_concrete');
                  }}
                  className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-800 hover:border-slate-700 transition text-center"
                >
                  Urban Loft
                </button>
                <button
                  onClick={() => {
                    applyMaterialToAllWalls('paint_pure_white');
                    setFloorMaterial('floor_carrara_marble');
                    setCeilingMaterial('ceil_matte_white');
                  }}
                  className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-800 hover:border-slate-700 transition text-center"
                >
                  Minimalist
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: FURNITURE & CURTAINS STUDIO (Stage 4) */}
        {/* ============================================================ */}
        {activeTab === 'furniture' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Custom .GLB Upload Button */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-950/60 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-dashed border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Custom .GLB / .GLTF 3D Asset</span>
              </button>
            </div>

            {/* Selected Furniture Item Inspector */}
            {selectedFurniture ? (
              <div className="p-3 border-b border-slate-800/80 bg-slate-950/80 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Armchair className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-semibold text-white text-xs truncate">
                      {selectedFurniture.name}
                    </span>
                  </div>
                  <span className="font-mono text-amber-400 text-xs font-bold">
                    ${selectedFurniture.price}
                  </span>
                </div>

                {/* Quick Rotate Controls */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium">Rotation</span>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: '-45°', val: -Math.PI / 4 },
                      { label: '+45°', val: Math.PI / 4 },
                      { label: '+90°', val: Math.PI / 2 },
                      { label: '180°', val: Math.PI },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          updateFurniture(selectedFurniture.id, {
                            rotationY: (selectedFurniture.rotationY + btn.val) % (Math.PI * 2),
                          })
                        }
                        className="py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-800 flex items-center justify-center gap-1 transition"
                      >
                        <RotateCw className="w-2.5 h-2.5 text-amber-400" />
                        <span>{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color / Fabric Tint Palette */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Upholstery &amp; Finish Tint
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {fabricColorPresets.map((col) => (
                      <button
                        key={col}
                        onClick={() => updateFurniture(selectedFurniture.id, { color: col })}
                        className={`w-6 h-6 rounded-lg border transition ${
                          selectedFurniture.color === col
                            ? 'ring-2 ring-amber-400 border-white scale-110'
                            : 'border-slate-700/80 hover:scale-105'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                {/* Duplicate & Delete Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => duplicateFurniture(selectedFurniture.id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Duplicate</span>
                  </button>

                  <button
                    onClick={() => removeFurniture(selectedFurniture.id)}
                    className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
                    title="Delete Furniture"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-950/40 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Select any placed furniture to move, rotate, or recolor.</span>
              </div>
            )}

            {/* Furniture Category Pills */}
            <div className="flex p-2 gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950/30 shrink-0">
              {furnitureCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFurnitureCategory(cat.id)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg shrink-0 transition ${
                    furnitureCategory === cat.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Catalog List with "+ Place" Buttons */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredFurniture.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl p-2.5 bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/80 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-amber-300 transition">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {item.dimensions.width}m × {item.dimensions.depth}m (H: {item.dimensions.height}m)
                    </p>
                    <span className="text-[11px] font-mono text-amber-400 font-semibold block mt-1">
                      ${item.price}
                    </span>
                  </div>

                  <button
                    onClick={() => handlePlaceFurniture(item)}
                    className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                    title={`Place ${item.name} into room`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Place</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
