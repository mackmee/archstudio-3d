'use client';

import React, { useRef } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { distance, formatMeters } from '@/lib/geometry';
import { getMaterialById } from '@/data/materials';
import {
  Sliders,
  Settings,
  Trash2,
  Image as ImageIcon,
  Ruler,
  Layers,
  DoorOpen,
  AppWindow,
  Tag,
  Eye,
  EyeOff,
  RotateCcw,
  Keyboard,
  Palette,
} from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
  const {
    ceilingHeight,
    setCeilingHeight,
    pixelsPerMeter,
    setPixelsPerMeter,
    floorMaterialId,
    ceilingMaterialId,
    setCurrentMode,
    setSelected3DTarget,
    backgroundImage,
    updateBackgroundImage,
    setBackgroundImage,
    walls,
    openings,
    rooms,
    selectedId,
    updateWall,
    deleteWall,
    updateOpening,
    deleteOpening,
    updateRoom,
    deleteRoom,
    setActiveTool,
  } = useFloorplanStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedWall = walls.find((w) => w.id === selectedId);
  const selectedOpening = openings.find((o) => o.id === selectedId);
  const selectedRoom = rooms.find((r) => r.id === selectedId);

  const totalWallLength = walls.reduce((sum, w) => sum + distance(w.start, w.end), 0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setBackgroundImage({
          url: dataUrl,
          opacity: 0.5,
          visible: true,
          width: img.width,
          height: img.height,
          x: 0,
          y: 0,
        });
        setActiveTool('calibrate');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const roomPresets = [
    'Living Room',
    'Master Bedroom',
    'Kitchen',
    'Bathroom',
    'Dining Room',
    'Guest Bedroom',
    'Office / Study',
    'Balcony',
    'Corridor',
  ];

  return (
    <aside className="w-80 border-l border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col h-full z-20 text-slate-200 select-none overflow-y-auto">
      {/* Panel Header */}
      <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold tracking-wide uppercase text-slate-100">
            {selectedWall
              ? 'Wall Inspector'
              : selectedOpening
              ? `${selectedOpening.type === 'door' ? 'Door' : 'Window'} Inspector`
              : selectedRoom
              ? 'Room Inspector'
              : 'Project Inspector'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-6 flex-1 text-xs">
        {/* ============================================================ */}
        {/* SELECTED ITEM INSPECTOR */}
        {/* ============================================================ */}

        {/* 1. WALL INSPECTOR */}
        {selectedWall && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Wall Length</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">
                  {formatMeters(distance(selectedWall.start, selectedWall.end))}
                </span>
              </div>

              {/* Wall Thickness */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">
                  Thickness ({selectedWall.thickness}m)
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[0.1, 0.15, 0.2, 0.25].map((t) => (
                    <button
                      key={t}
                      onClick={() => updateWall(selectedWall.id, { thickness: t })}
                      className={`py-1 rounded text-[11px] font-mono transition ${
                        Math.abs(selectedWall.thickness - t) < 0.001
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {t}m
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.01"
                  value={selectedWall.thickness}
                  onChange={(e) =>
                    updateWall(selectedWall.id, { thickness: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Start & End Coordinates */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900 text-[11px]">
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Start (X, Y)</span>
                  <span className="font-mono text-slate-300">
                    {selectedWall.start.x.toFixed(2)}m, {selectedWall.start.y.toFixed(2)}m
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">End (X, Y)</span>
                  <span className="font-mono text-slate-300">
                    {selectedWall.end.x.toFixed(2)}m, {selectedWall.end.y.toFixed(2)}m
                  </span>
                </div>
              </div>

              {/* Wall Surface Materials */}
              <div className="pt-2 border-t border-slate-900 space-y-2">
                <span className="text-slate-400 block font-medium flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
                  Wall Materials &amp; Finishes
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-0.5">Side A Finish</span>
                    <span className="text-white font-medium truncate block">
                      {getMaterialById(selectedWall.materialLeftId).name}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-0.5">Side B Finish</span>
                    <span className="text-white font-medium truncate block">
                      {getMaterialById(selectedWall.materialRightId).name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelected3DTarget({ type: 'wall', id: selectedWall.id, side: 'both' });
                    setCurrentMode('3d');
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Customize Textures in 3D</span>
                </button>
              </div>
            </div>

            {/* Delete Wall Button */}
            <button
              onClick={() => deleteWall(selectedWall.id)}
              className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Wall</span>
            </button>
          </div>
        )}

        {/* 2. OPENING INSPECTOR (DOOR / WINDOW) */}
        {selectedOpening && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                {selectedOpening.type === 'door' ? (
                  <DoorOpen className="w-4 h-4 text-amber-400" />
                ) : (
                  <AppWindow className="w-4 h-4 text-cyan-400" />
                )}
                <span className="font-semibold capitalize text-white">
                  {selectedOpening.type}
                </span>
                <span className="text-[10px] text-slate-500 font-mono ml-auto">
                  Wall: {selectedOpening.wallId.slice(0, 8)}
                </span>
              </div>

              {/* Width Slider / Input */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Width</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {selectedOpening.width.toFixed(2)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.05"
                  value={selectedOpening.width}
                  onChange={(e) =>
                    updateOpening(selectedOpening.id, { width: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Height Slider / Input */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Height</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {selectedOpening.height.toFixed(2)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.05"
                  value={selectedOpening.height}
                  onChange={(e) =>
                    updateOpening(selectedOpening.id, { height: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Sill Height */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Sill Height</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {selectedOpening.sillHeight.toFixed(2)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={selectedOpening.sillHeight}
                  onChange={(e) =>
                    updateOpening(selectedOpening.id, { sillHeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Position along wall */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Position Along Wall</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {(selectedOpening.positionRatio * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.01"
                  value={selectedOpening.positionRatio}
                  onChange={(e) =>
                    updateOpening(selectedOpening.id, { positionRatio: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Door Swing Flip Toggle */}
              {selectedOpening.type === 'door' && (
                <button
                  onClick={() =>
                    updateOpening(selectedOpening.id, { flip: !selectedOpening.flip })
                  }
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center gap-2 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Flip Swing Direction</span>
                </button>
              )}
            </div>

            {/* Delete Opening */}
            <button
              onClick={() => deleteOpening(selectedOpening.id)}
              className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete {selectedOpening.type === 'door' ? 'Door' : 'Window'}</span>
            </button>
          </div>
        )}

        {/* 3. ROOM INSPECTOR */}
        {selectedRoom && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">Room Label</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Room Name</label>
                <input
                  type="text"
                  value={selectedRoom.name}
                  onChange={(e) => updateRoom(selectedRoom.id, { name: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-medium focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Presets */}
              <div>
                <span className="text-slate-400 block mb-1.5 font-medium">Presets</span>
                <div className="flex flex-wrap gap-1.5">
                  {roomPresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => updateRoom(selectedRoom.id, { name: preset })}
                      className={`px-2 py-1 rounded-md text-[10px] transition ${
                        selectedRoom.name === preset
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coordinates */}
              <div className="pt-2 border-t border-slate-900 text-[11px] flex justify-between text-slate-400">
                <span>Location:</span>
                <span className="font-mono text-slate-300">
                  X: {selectedRoom.x.toFixed(2)}m, Y: {selectedRoom.y.toFixed(2)}m
                </span>
              </div>
            </div>

            {/* Delete Room */}
            <button
              onClick={() => deleteRoom(selectedRoom.id)}
              className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Room Marker</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* GLOBAL SETTINGS (Always available) */}
        {/* ============================================================ */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span>Global Floorplan Settings</span>
          </div>

          <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 space-y-3">
            {/* Ceiling Height */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Ceiling Height</span>
                <span className="font-mono text-cyan-300 font-semibold">
                  {ceilingHeight.toFixed(2)} m
                </span>
              </div>
              <input
                type="range"
                min="2.0"
                max="5.0"
                step="0.05"
                value={ceilingHeight}
                onChange={(e) => setCeilingHeight(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Directly feeds 3D wall height extrusion in Stage 2.
              </span>
            </div>

            {/* Pixels per Meter */}
            <div className="pt-2 border-t border-slate-900">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Scale (Pixels/Meter)</span>
                <span className="font-mono text-amber-300 font-semibold">
                  {pixelsPerMeter} px/m
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                step="1"
                value={pixelsPerMeter}
                onChange={(e) => setPixelsPerMeter(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Global Floor & Ceiling Finishes */}
            <div className="pt-2 border-t border-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  Floor &amp; Ceiling Finishes
                </span>
                <button
                  onClick={() => setCurrentMode('3d')}
                  className="text-[10px] text-cyan-400 hover:underline font-semibold"
                >
                  Edit in 3D →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Floor</span>
                  <span className="text-white font-medium truncate block">
                    {getMaterialById(floorMaterialId).name}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Ceiling</span>
                  <span className="text-white font-medium truncate block">
                    {getMaterialById(ceilingMaterialId).name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Background Blueprint Image Inspector */}
          <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-slate-200">Blueprint Image</span>
              </div>
              {backgroundImage && (
                <button
                  onClick={() =>
                    updateBackgroundImage({ visible: !backgroundImage.visible })
                  }
                  title={backgroundImage.visible ? 'Hide Blueprint' : 'Show Blueprint'}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  {backgroundImage.visible ? (
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </button>
              )}
            </div>

            {backgroundImage ? (
              <div className="space-y-3">
                {/* Opacity Slider */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Opacity</span>
                    <span className="font-mono text-slate-200">
                      {Math.round(backgroundImage.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={backgroundImage.opacity}
                    onChange={(e) =>
                      updateBackgroundImage({ opacity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTool('calibrate')}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium flex items-center justify-center gap-1.5 transition text-[11px]"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Calibrate Scale</span>
                  </button>

                  <button
                    onClick={() => setBackgroundImage(null)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                    title="Remove Blueprint Image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-dashed border-slate-700 hover:border-amber-400/50 flex flex-col items-center gap-1 transition"
                >
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span className="font-medium text-slate-200">Upload Blueprint (JPG/PNG)</span>
                  <span className="text-[10px] text-slate-500">Trace walls over real floorplan</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Empty selection state: Architectural overview & hotkeys */}
        {!selectedWall && !selectedOpening && !selectedRoom && (
          <div className="space-y-4 pt-2 border-t border-slate-800 text-slate-400">
            {/* Project Summary */}
            <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 space-y-2">
              <span className="text-slate-300 font-semibold block flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Floorplan Statistics
              </span>
              <div className="flex justify-between text-[11px]">
                <span>Total Walls:</span>
                <span className="font-mono text-slate-200">{walls.length}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Total Wall Length:</span>
                <span className="font-mono text-cyan-300">{formatMeters(totalWallLength)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Doors & Windows:</span>
                <span className="font-mono text-slate-200">{openings.length}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Rooms Defined:</span>
                <span className="font-mono text-slate-200">{rooms.length}</span>
              </div>
            </div>

            {/* Quick Shortcuts */}
            <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Hotkeys</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Select Tool</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]">V</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Draw Wall</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]">W</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Add Door</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]">D</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Toggle Grid</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]">G</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pan Canvas</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]">Space + Drag</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stop Wall Chain</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]">Esc / Right-Click</kbd>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
