'use client';

import React, { useRef } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { ToolType } from '@/types/floorplan';
import {
  MousePointer,
  Hand,
  Upload,
  Ruler,
  Square,
  DoorOpen,
  AppWindow,
  Tag,
  Magnet,
  Grid,
} from 'lucide-react';

interface ToolItem {
  id: ToolType;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const LeftToolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    isOrthoSnapEnabled,
    toggleOrthoSnap,
    showGrid,
    toggleShowGrid,
    setBackgroundImage,
  } = useFloorplanStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mainTools: ToolItem[] = [
    { id: 'select', label: 'Select & Edit', shortcut: 'V', icon: MousePointer },
    { id: 'pan', label: 'Pan Canvas', shortcut: 'H / Space', icon: Hand },
    { id: 'calibrate', label: 'Calibrate Scale', shortcut: 'C', icon: Ruler },
    { id: 'wall', label: 'Draw Wall', shortcut: 'W', icon: Square },
    { id: 'door', label: 'Add Door', shortcut: 'D', icon: DoorOpen },
    { id: 'window', label: 'Add Window', shortcut: 'N', icon: AppWindow },
    { id: 'room', label: 'Room Label', shortcut: 'R', icon: Tag },
  ];

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
        // Switch to calibrate tool to encourage scale calibration
        setActiveTool('calibrate');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    // Reset file input value so re-uploading same file works
    e.target.value = '';
  };

  return (
    <aside className="w-16 border-r border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col items-center py-3 z-20 gap-1 select-none">
      {/* Hidden File Input for Blueprint Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Main CAD Tools */}
      <div className="flex flex-col gap-1 w-full px-2">
        {mainTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              className={`group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 shadow-xs shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 font-medium leading-none truncate max-w-full">
                {tool.label.split(' ')[0]}
              </span>

              {/* Tooltip on hover */}
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                <span className="font-semibold">{tool.label}</span>
                <span className="text-slate-400 ml-1.5 text-[10px]">[{tool.shortcut}]</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Blueprint Image Upload Button */}
      <div className="w-full px-2 mt-1">
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload Blueprint Image (JPG/PNG)"
          className="group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 border border-transparent transition-all"
        >
          <Upload className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-medium leading-none">Upload</span>

          <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            <span className="font-semibold">Upload Blueprint</span>
            <span className="text-amber-400 block text-[10px]">JPG, PNG floorplan</span>
          </div>
        </button>
      </div>

      <div className="w-8 h-px bg-slate-800 my-1" />

      {/* Architectural Snapping & Display Toggles */}
      <div className="flex flex-col gap-1 w-full px-2 mt-auto">
        {/* Ortho Snap Toggle */}
        <button
          onClick={toggleOrthoSnap}
          title={`Ortho Snap: ${isOrthoSnapEnabled ? 'ON (0°, 45°, 90°)' : 'OFF'}`}
          className={`group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl transition ${
            isOrthoSnapEnabled
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-xs'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <Magnet className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-medium leading-none">Ortho</span>

          <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            <span className="font-semibold">Ortho Snap (0°/45°/90°)</span>
            <span className={`block text-[10px] ${isOrthoSnapEnabled ? 'text-emerald-400' : 'text-slate-400'}`}>
              {isOrthoSnapEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
        </button>

        {/* Grid Toggle */}
        <button
          onClick={toggleShowGrid}
          title={`Architectural Grid: ${showGrid ? 'ON' : 'OFF'} (G)`}
          className={`group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl transition ${
            showGrid
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 shadow-xs'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-medium leading-none">Grid</span>

          <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            <span className="font-semibold">CAD Grid (1m / 0.5m)</span>
            <span className="text-slate-400 ml-1.5 text-[10px]">[G]</span>
          </div>
        </button>
      </div>
    </aside>
  );
};
