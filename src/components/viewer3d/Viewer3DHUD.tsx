'use client';

import React from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
import {
  RotateCcw,
  Eye,
  EyeOff,
  Tag,
  Footprints,
  Box,
  Layers,
  Calculator,
  Sun,
  Sunset,
  Moon,
  Scissors,
  Compass,
  Camera,
  Scan,
  Armchair,
} from 'lucide-react';
import { autoFurnishFloorplan } from '@/lib/autoFurnish';

interface Viewer3DHUDProps {
  onResetCamera: () => void;
}

export const Viewer3DHUD: React.FC<Viewer3DHUDProps> = ({ onResetCamera }) => {
  const {
    rooms,
    walls,
    furniture,
    view3dSettings,
    setCameraMode3D,
    setLightingPreset,
    toggleCutawayMode,
    setFocusedRoomId,
    toggleFovMode,
    toggleAutoHideBlockingWalls,
    toggleCeiling3D,
    toggleRoomLabels3D,
    setCurrentMode,
  } = useFloorplanStore();

  const { language } = usePreferencesStore();
  const isOrbit = view3dSettings.cameraMode === 'orbit';
  const lightingPreset = view3dSettings.lightingPreset || 'day';

  const handleAutoFurnish = () => {
    if (rooms.length === 0) return;
    const res = autoFurnishFloorplan(rooms, walls, furniture);
    if (res.addedCount > 0) {
      useFloorplanStore.setState({ furniture: res.newFurniture });
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-6 pointer-events-none z-30 flex flex-col items-center gap-2.5 px-4 select-none">
      {/* Walkthrough Instructions Banner */}
      {!isOrbit && (
        <div className="pointer-events-auto bg-white/95 dark:bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 text-cyan-800 dark:text-cyan-200 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Footprints className="w-4 h-4 text-cyan-500 shrink-0 animate-pulse" />
          <span>{getTranslation(language, 'walkthroughHint')}</span>
          <button
            onClick={() => setCameraMode3D('orbit')}
            className="ml-2 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold transition cursor-pointer"
          >
            {getTranslation(language, 'exitWalkthrough')}
          </button>
        </div>
      )}

      {/* Quick Room Switcher Pill Bar (Camera Jump) */}
      {rooms.length > 0 && (
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-lg text-xs overflow-x-auto max-w-[92vw]">
          <button
            onClick={() => setFocusedRoomId(null)}
            className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              !view3dSettings.focusedRoomId
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{getTranslation(language, 'roomJumpAll')}</span>
          </button>

          {rooms.map((room) => {
            const isFocused = view3dSettings.focusedRoomId === room.id;
            return (
              <button
                key={room.id}
                onClick={() => setFocusedRoomId(room.id)}
                className={`px-2.5 py-1 rounded-xl font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  isFocused
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Tag className="w-3 h-3 text-cyan-500" />
                <span>{room.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Floating 3D Control Pill */}
      <div className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 p-1.5 rounded-2xl shadow-2xl flex flex-wrap items-center justify-center gap-2">
        {/* Camera Mode Toggle: Orbit vs Walkthrough */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setCameraMode3D('orbit')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              isOrbit
                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
            }`}
            title={getTranslation(language, 'orbitView')}
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{getTranslation(language, 'orbitView')}</span>
          </button>

          <button
            onClick={() => setCameraMode3D('walkthrough')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              !isOrbit
                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
            }`}
            title={getTranslation(language, 'walkthroughView')}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{getTranslation(language, 'walkthroughView')}</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* 3 Real-Time Lighting Presets (Day / Sunset / Night) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setLightingPreset('day')}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              lightingPreset === 'day'
                ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title={getTranslation(language, 'lightingPresetDay')}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLightingPreset('sunset')}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              lightingPreset === 'sunset'
                ? 'bg-white dark:bg-slate-800 text-orange-500 shadow-xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title={getTranslation(language, 'lightingPresetSunset')}
          >
            <Sunset className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLightingPreset('night')}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              lightingPreset === 'night'
                ? 'bg-white dark:bg-slate-800 text-indigo-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            title={getTranslation(language, 'lightingPresetNight')}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* FOV Toggle: Standard vs Wide Angle */}
        <button
          onClick={toggleFovMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
            view3dSettings.fovMode === 'wide'
              ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800'
          }`}
          title={getTranslation(language, 'fovToggleTooltip')}
        >
          <Camera className="w-3.5 h-3.5 text-cyan-500" />
          <span className="hidden md:inline">
            {view3dSettings.fovMode === 'wide'
              ? getTranslation(language, 'fovWide')
              : getTranslation(language, 'fovStandard')}
          </span>
        </button>

        {/* Auto-Hide Blocking Front Walls Toggle */}
        <button
          onClick={toggleAutoHideBlockingWalls}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
            view3dSettings.autoHideBlockingWalls
              ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800'
          }`}
          title={getTranslation(language, 'autoHideWallsDesc')}
        >
          <Scan className="w-3.5 h-3.5 text-teal-500" />
          <span className="hidden md:inline">{getTranslation(language, 'autoHideWalls')}</span>
        </button>

        {/* Cutaway / Dollhouse View Button */}
        <button
          onClick={toggleCutawayMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
            view3dSettings.cutawayMode
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800'
          }`}
          title={getTranslation(language, 'cutawayHint')}
        >
          <Scissors className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline">{getTranslation(language, 'cutawayToggle')}</span>
        </button>

        {/* Ceiling Slab Toggle */}
        <button
          onClick={toggleCeiling3D}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
            view3dSettings.showCeiling
              ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40'
              : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800'
          }`}
          title="Toggle Ceiling"
        >
          {view3dSettings.showCeiling ? (
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          )}
          <span className="hidden lg:inline">{getTranslation(language, 'ceilingToggle')}</span>
        </button>

        {/* Room Labels Toggle */}
        <button
          onClick={toggleRoomLabels3D}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
            view3dSettings.showRoomLabels
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
              : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800'
          }`}
          title="Toggle Room Labels"
        >
          <Tag className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden lg:inline">{getTranslation(language, 'roomLabelsToggle')}</span>
        </button>

        {/* Auto-Furnish Rooms Button */}
        {rooms.length > 0 && (
          <button
            onClick={handleAutoFurnish}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-xs transition cursor-pointer"
            title={getTranslation(language, 'autoFurnishTooltip')}
          >
            <Armchair className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden md:inline">{getTranslation(language, 'autoFurnishBtn')}</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Reset Camera View */}
        <button
          onClick={onResetCamera}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-950/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
          title={getTranslation(language, 'resetCamera')}
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Switch back to 2D Editor */}
        <button
          onClick={() => setCurrentMode('2d')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          title="Return to Step 2"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{getTranslation(language, 'backTo2D')}</span>
        </button>

        {/* Proceed to Step 4: Estimator */}
        <button
          onClick={() => setCurrentMode('estimator')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-700/20 transition cursor-pointer"
          title="Proceed to Step 4"
        >
          <Calculator className="w-3.5 h-3.5 text-white" />
          <span className="hidden sm:inline">{getTranslation(language, 'proceedToEstimate')}</span>
        </button>
      </div>
    </div>
  );
};
