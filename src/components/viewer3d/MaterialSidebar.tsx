'use client';

import React, { useState } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import {
  MaterialCategory,
  MaterialItem,
  getMaterialsByCategory,
} from '@/data/materials';
import { distance, formatMeters } from '@/lib/geometry';
import {
  Palette,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Square,
  HelpCircle,
} from 'lucide-react';

export const MaterialSidebar: React.FC = () => {
  const {
    walls,
    selected3DTarget,
    setWallMaterial,
    applyMaterialToAllWalls,
    floorMaterialId,
    setFloorMaterial,
    ceilingMaterialId,
    setCeilingMaterial,
  } = useFloorplanStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MaterialCategory>('wallpaper');
  const [prevTargetType, setPrevTargetType] = useState<string | undefined>(selected3DTarget?.type);
  const [wallSide, setWallSide] = useState<'both' | 'left' | 'right'>('both');

  // React-recommended render-time category adjustment on target change
  if (selected3DTarget?.type !== prevTargetType) {
    setPrevTargetType(selected3DTarget?.type);
    if (selected3DTarget?.type === 'floor') {
      setActiveCategory('flooring');
    } else if (selected3DTarget?.type === 'ceiling') {
      setActiveCategory('ceiling');
    } else if (
      selected3DTarget?.type === 'wall' &&
      (activeCategory === 'flooring' || activeCategory === 'ceiling')
    ) {
      setActiveCategory('wallpaper');
    }
  }

  const selectedWall =
    selected3DTarget?.type === 'wall'
      ? walls.find((w) => w.id === selected3DTarget.id)
      : null;

  const currentWallLength = selectedWall
    ? formatMeters(distance(selectedWall.start, selectedWall.end))
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
      // No specific target selected: apply globally
      if (item.category === 'wallpaper' || item.category === 'paint') {
        applyMaterialToAllWalls(item.id);
      } else if (item.category === 'flooring') {
        setFloorMaterial(item.id);
      } else if (item.category === 'ceiling') {
        setCeilingMaterial(item.id);
      }
    }
  };

  const categories: { id: MaterialCategory; label: string }[] = [
    { id: 'wallpaper', label: 'Wallpaper' },
    { id: 'paint', label: 'Paint' },
    { id: 'flooring', label: 'Flooring' },
    { id: 'ceiling', label: 'Ceiling' },
  ];

  const categoryMaterials = getMaterialsByCategory(activeCategory);

  return (
    <div
      className={`absolute right-0 top-0 bottom-0 z-20 flex transition-transform duration-300 ${
        isCollapsed ? 'translate-x-[calc(100%-2.5rem)]' : 'translate-x-0'
      }`}
    >
      {/* Collapse / Expand Toggle Button */}
      <div className="flex items-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-14 w-8 rounded-l-xl bg-slate-900/95 border-l border-t border-b border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center shadow-xl backdrop-blur-md transition hover:bg-slate-800"
          title={isCollapsed ? 'Expand Material Studio' : 'Collapse Material Studio'}
        >
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Material Studio Panel */}
      <aside className="w-80 h-full bg-slate-900/95 border-l border-slate-800 backdrop-blur-xl flex flex-col text-slate-200 select-none shadow-2xl">
        {/* Panel Header */}
        <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold tracking-wide uppercase text-white">
              Material Studio
            </span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            PBR Textures
          </span>
        </div>

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

          {/* If Wall selected: Both Sides / Side A / Side B toggle */}
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
                  title="Side A (+Z Room Face)"
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
                  title="Side B (-Z Room Face)"
                >
                  Side B
                </button>
              </div>

              <div className="flex gap-2">
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
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Click any wall, floor, or ceiling in 3D to customize it individually.</span>
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
                {/* Visual Swatch Preview Box */}
                <div
                  className="w-12 h-12 rounded-lg border border-slate-700/80 shadow-inner shrink-0 relative overflow-hidden"
                  style={{ backgroundColor: item.color }}
                >
                  {/* Subtle procedural pattern indicator overlay */}
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

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition">
                      {item.name}
                    </h4>
                  </div>
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
            Quick Apartment Style Presets:
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => {
                applyMaterialToAllWalls('wp_linen_beige');
                setFloorMaterial('floor_natural_oak');
                setCeilingMaterial('ceil_matte_white');
              }}
              className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-800 hover:border-slate-700 transition text-center"
              title="Nordic Linen + Natural Oak Floor"
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
              title="Exposed Brick + Concrete Floor"
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
              title="Pure White Paint + Carrara Marble Floor"
            >
              Minimalist
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
