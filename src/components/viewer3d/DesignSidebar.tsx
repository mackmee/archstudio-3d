'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { formatPrice } from '@/lib/currency';
import { getTranslation, materialNames, furnitureNames } from '@/lib/i18n';
import {
  MaterialCategory,
  MaterialItem,
  getMaterialsByCategory,
  getMaterialById,
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
  Pipette,
} from 'lucide-react';

export const DesignSidebar: React.FC = () => {
  const {
    walls,
    rooms,
    selected3DTarget,
    setWallMaterial,
    applyMaterialToAllWalls,
    applyMaterialToRoom,
    view3dSettings,
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

  const { language, currency, usdToUzsRate } = usePreferencesStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'materials' | 'furniture'>('materials');

  // Materials Sub-state
  const [activeCategory, setActiveCategory] = useState<MaterialCategory>('wallpaper');
  const [wallSide, setWallSide] = useState<'both' | 'left' | 'right'>('both');
  const [prevTargetType, setPrevTargetType] = useState<string | undefined>(selected3DTarget?.type);

  // Eye-Dropper (Pipetka) & Apply to Room state
  const [isEyeDropperActive, setIsEyeDropperActive] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [selectedRoomToApply, setSelectedRoomToApply] = useState<string>('');

  // Active room for "Apply to Room" feature
  const activeTargetRoomId = view3dSettings.focusedRoomId || selectedRoomToApply || (rooms[0]?.id ?? '');

  // Furniture Sub-state
  const [furnitureCategory, setFurnitureCategory] = useState<FurnitureCategory | 'all'>('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Eye-Dropper sampling effect: when active and user clicks on a 3D element
  useEffect(() => {
    if (!isEyeDropperActive || !selected3DTarget) return;

    let sampledMatId: string | undefined;
    if (selected3DTarget.type === 'wall') {
      const wall = walls.find((w) => w.id === selected3DTarget.id);
      if (wall) {
        if (wallSide === 'right') {
          sampledMatId = wall.materialRightId || wall.materialLeftId;
        } else {
          sampledMatId = wall.materialLeftId || wall.materialRightId;
        }
      }
    } else if (selected3DTarget.type === 'floor') {
      sampledMatId = floorMaterialId;
    } else if (selected3DTarget.type === 'ceiling') {
      sampledMatId = ceilingMaterialId;
    }

    if (sampledMatId) {
      const mat = getMaterialById(sampledMatId);
      const name = materialNames[mat.id]?.[language] || mat.name;
      const sampledCategory = mat.category;
      const msg = `${getTranslation(language, 'eyeDropperSampled')} ${name}`;

      const t1 = setTimeout(() => {
        setActiveCategory(sampledCategory);
        setIsEyeDropperActive(false);
        setFeedbackMsg(msg);
      }, 0);

      const t2 = setTimeout(() => setFeedbackMsg(null), 3000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [selected3DTarget, isEyeDropperActive, walls, wallSide, floorMaterialId, ceilingMaterialId, language]);

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
      name: furnitureNames[catItem.id]?.[language] || catItem.name,
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
    { id: 'wallpaper', label: language === 'uz' ? 'Gulqog‘oz' : 'Обои' },
    { id: 'paint', label: language === 'uz' ? 'Bo‘yoq' : 'Краска' },
    { id: 'flooring', label: language === 'uz' ? 'Pol' : 'Пол' },
    { id: 'ceiling', label: language === 'uz' ? 'Shift' : 'Потолок' },
  ];

  const furnitureCategories: { id: FurnitureCategory | 'all'; label: string }[] = [
    { id: 'all', label: language === 'uz' ? 'Hammasi' : 'Все' },
    { id: 'living', label: language === 'uz' ? 'Mehmonxona' : 'Гостиная' },
    { id: 'bedroom', label: language === 'uz' ? 'Yotoqxona' : 'Спальня' },
    { id: 'kitchen', label: language === 'uz' ? 'Oshxona' : 'Кухня' },
    { id: 'curtains', label: language === 'uz' ? 'Pardalar' : 'Шторы' },
    { id: 'decor', label: language === 'uz' ? 'Bezak' : 'Декор' },
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
          className="h-14 w-8 rounded-l-xl bg-white/95 dark:bg-slate-900/95 border-l border-t border-b border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center shadow-xl backdrop-blur-md transition hover:bg-slate-100 dark:hover:bg-slate-800"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Studio Sidebar Panel */}
      <aside className="w-84 h-full bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 backdrop-blur-xl flex flex-col text-slate-800 dark:text-slate-200 select-none shadow-2xl transition-colors duration-200">
        {/* Top Switcher Tabs: Materials vs Furniture */}
        <div className="h-13 border-b border-slate-200 dark:border-slate-800 px-3 flex items-center gap-1.5 bg-slate-100/70 dark:bg-slate-950/70 shrink-0">
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'materials'
                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/60'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{getTranslation(language, 'tabMaterials')}</span>
          </button>

          <button
            onClick={() => setActiveTab('furniture')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'furniture'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/60'
            }`}
          >
            <Armchair className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{getTranslation(language, 'tabFurniture')}</span>
            {furniture.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                {furniture.length}
              </span>
            )}
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: MATERIALS STUDIO */}
        {/* ============================================================ */}
        {activeTab === 'materials' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Target Inspector Card */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60 shrink-0 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                  <Square className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  {language === 'uz' ? 'Tanlangan yuza:' : 'Выбранная зона:'}
                </span>

                <div className="flex items-center gap-1.5">
                  {/* Eye-Dropper (Pipetka) Tool */}
                  <button
                    onClick={() => setIsEyeDropperActive(!isEyeDropperActive)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      isEyeDropperActive
                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25 ring-2 ring-cyan-400 animate-pulse'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400'
                    }`}
                    title={getTranslation(language, 'eyeDropperTool')}
                  >
                    <Pipette className="w-3.5 h-3.5" />
                    <span>{getTranslation(language, 'eyeDropperTool')}</span>
                  </button>

                  <span className="font-semibold text-slate-900 dark:text-white font-mono">
                    {selectedWall
                      ? `${language === 'uz' ? 'Devor' : 'Стена'} (${currentWallLength})`
                      : selected3DTarget?.type === 'floor'
                      ? language === 'uz' ? 'Pol' : 'Пол'
                      : selected3DTarget?.type === 'ceiling'
                      ? language === 'uz' ? 'Shift' : 'Потолок'
                      : language === 'uz' ? 'Barchasi' : 'Все'}
                  </span>
                </div>
              </div>

              {/* Eye-Dropper Active Status Banner */}
              {isEyeDropperActive && (
                <div className="text-[11px] bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 p-2 rounded-lg flex items-center gap-1.5 animate-pulse">
                  <Pipette className="w-3.5 h-3.5 shrink-0" />
                  <span>{getTranslation(language, 'eyeDropperActive')}</span>
                </div>
              )}

              {/* Notification Banner */}
              {feedbackMsg && (
                <div className="text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 p-2 rounded-lg flex items-center gap-1.5 transition-all">
                  <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>{feedbackMsg}</span>
                </div>
              )}

              {selectedWall ? (
                <div className="space-y-2">
                  <div className="flex rounded-lg bg-white dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800 text-[11px]">
                    <button
                      onClick={() => setWallSide('both')}
                      className={`flex-1 py-1 rounded-md font-medium transition ${
                        wallSide === 'both'
                          ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {language === 'uz' ? 'Ikkala tomon' : 'Обе стороны'}
                    </button>
                    <button
                      onClick={() => setWallSide('left')}
                      className={`flex-1 py-1 rounded-md font-medium transition ${
                        wallSide === 'left'
                          ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {language === 'uz' ? 'A-Tomon (+Z)' : 'Сторона А'}
                    </button>
                    <button
                      onClick={() => setWallSide('right')}
                      className={`flex-1 py-1 rounded-md font-medium transition ${
                        wallSide === 'right'
                          ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {language === 'uz' ? 'B-Tomon (-Z)' : 'Сторона Б'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{language === 'uz' ? 'Rang berish uchun 3D devor yoki polni bosing.' : 'Кликните по стене или полу для настройки.'}</span>
                </div>
              )}

              {/* Batch Material Application Buttons: Apply to Room & Apply to All Walls */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
                {rooms.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={activeTargetRoomId}
                      onChange={(e) => setSelectedRoomToApply(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] py-1.5 px-2 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const matToApply =
                          currentActiveMaterialId ||
                          (categoryMaterials[0]?.id ?? 'wp_linen_beige');
                        if (activeTargetRoomId) {
                          applyMaterialToRoom(activeTargetRoomId, matToApply);
                          const rObj = rooms.find((r) => r.id === activeTargetRoomId);
                          setFeedbackMsg(
                            `${rObj?.name || ''}: ${getTranslation(language, 'applyToRoomSuccess')}`
                          );
                          setTimeout(() => setFeedbackMsg(null), 3000);
                        }
                      }}
                      className="py-1.5 px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-[11px] font-medium flex items-center gap-1 transition shrink-0"
                      title={getTranslation(language, 'applyToRoomBtn')}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{getTranslation(language, 'applyToRoomBtn')}</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    const matToApply =
                      currentActiveMaterialId ||
                      (categoryMaterials[0]?.id ?? 'wp_linen_beige');
                    applyMaterialToAllWalls(matToApply);
                    setFeedbackMsg(
                      language === 'uz'
                        ? 'Barcha devorlarga muvaffaqiyatli qo‘llandi!'
                        : 'Успешно применено ко всем стенам!'
                    );
                    setTimeout(() => setFeedbackMsg(null), 3000);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{getTranslation(language, 'applyToAllWallsBtn')}</span>
                </button>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="grid grid-cols-4 p-2 gap-1 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`py-1.5 text-[11px] font-semibold rounded-lg transition ${
                    activeCategory === cat.id
                      ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
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
                const displayName = materialNames[item.id]?.[language] || item.name;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectMaterial(item)}
                    className={`group cursor-pointer rounded-xl p-2.5 border transition-all duration-150 flex items-center gap-3 ${
                      isCurrent
                        ? 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                        : 'bg-white/80 dark:bg-slate-950/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700/80 shadow-inner shrink-0 relative overflow-hidden"
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
                        <div className="absolute inset-0 bg-cyan-500/25 flex items-center justify-center text-cyan-800 dark:text-white">
                          <Check className="w-5 h-5 drop-shadow" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition">
                        {displayName}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.description || `${item.pattern || 'solid'} finish`}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                          {formatPrice(item.pricePerUnit, currency, language, usdToUzsRate)}
                        </span>
                        <span className="text-[10px] text-slate-400">/ {item.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Apartment Theme Presets Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shrink-0 space-y-1.5">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {getTranslation(language, 'stylePresets')}:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => {
                    applyMaterialToAllWalls('wp_linen_beige');
                    setFloorMaterial('floor_natural_oak');
                    setCeilingMaterial('ceil_matte_white');
                  }}
                  className="py-1 px-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition text-center shadow-2xs"
                >
                  Scandi Oak
                </button>
                <button
                  onClick={() => {
                    applyMaterialToAllWalls('wp_exposed_brick');
                    setFloorMaterial('floor_light_concrete');
                    setCeilingMaterial('ceil_recessed_concrete');
                  }}
                  className="py-1 px-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition text-center shadow-2xs"
                >
                  Urban Loft
                </button>
                <button
                  onClick={() => {
                    applyMaterialToAllWalls('paint_pure_white');
                    setFloorMaterial('floor_carrara_marble');
                    setCeilingMaterial('ceil_matte_white');
                  }}
                  className="py-1 px-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition text-center shadow-2xs"
                >
                  Minimalist
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: FURNITURE & CURTAINS STUDIO */}
        {/* ============================================================ */}
        {activeTab === 'furniture' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Custom .GLB Upload Button */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-dashed border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Upload className="w-4 h-4" />
                <span>{getTranslation(language, 'uploadGlb')}</span>
              </button>
            </div>

            {/* Selected Furniture Item Inspector */}
            {selectedFurniture ? (
              <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/80 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Armchair className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                      {selectedFurniture.name}
                    </span>
                  </div>
                  <span className="font-mono text-amber-600 dark:text-amber-400 text-xs font-bold">
                    {formatPrice(selectedFurniture.price, currency, language, usdToUzsRate)}
                  </span>
                </div>

                {/* Quick Rotate Controls */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {getTranslation(language, 'rotateItem')}
                  </span>
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
                        className="py-1 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1 transition shadow-2xs"
                      >
                        <RotateCw className="w-2.5 h-2.5 text-amber-500" />
                        <span>{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color / Fabric Tint Palette */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {getTranslation(language, 'customTint')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {fabricColorPresets.map((col) => (
                      <button
                        key={col}
                        onClick={() => updateFurniture(selectedFurniture.id, { color: col })}
                        className={`w-6 h-6 rounded-lg border transition ${
                          selectedFurniture.color === col
                            ? 'ring-2 ring-amber-500 border-white scale-110'
                            : 'border-slate-300 dark:border-slate-700/80 hover:scale-105'
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
                    className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[11px] font-medium flex items-center justify-center gap-1.5 transition shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>{getTranslation(language, 'duplicate')}</span>
                  </button>

                  <button
                    onClick={() => removeFurniture(selectedFurniture.id)}
                    className="py-1.5 px-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
                    title={getTranslation(language, 'deleteItem')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{getTranslation(language, 'deleteItem')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{language === 'uz' ? 'Siljitish yoki rangini o‘zgartirish uchun jihozni bosing.' : 'Кликните по предмету мебели для настроек.'}</span>
              </div>
            )}

            {/* Furniture Category Pills */}
            <div className="flex p-2 gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/30 shrink-0">
              {furnitureCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFurnitureCategory(cat.id)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg shrink-0 transition ${
                    furnitureCategory === cat.id
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Catalog List with "+ Place" Buttons */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredFurniture.map((item) => {
                const displayName = furnitureNames[item.id]?.[language] || item.name;

                return (
                  <div
                    key={item.id}
                    className="rounded-xl p-2.5 bg-white/80 dark:bg-slate-950/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 transition-all flex items-center justify-between gap-3 group shadow-2xs"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-300 transition">
                        {displayName}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.dimensions.width}m × {item.dimensions.depth}m (H: {item.dimensions.height}m)
                      </p>
                      <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold block mt-1">
                        {formatPrice(item.price, currency, language, usdToUzsRate)}
                      </span>
                    </div>

                    <button
                      onClick={() => handlePlaceFurniture(item)}
                      className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                      title={getTranslation(language, 'placeItem')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{getTranslation(language, 'placeItem')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
