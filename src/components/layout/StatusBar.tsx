'use client';

import React from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { Info, Ruler, Compass, Layers } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const {
    activeTool,
    pixelsPerMeter,
    isOrthoSnapEnabled,
    walls,
    openings,
    rooms,
    ceilingHeight,
  } = useFloorplanStore();

  const getToolHint = () => {
    switch (activeTool) {
      case 'select':
        return 'Click any wall, opening, or room to inspect/drag. Press Backspace/Del to delete.';
      case 'pan':
        return 'Drag to pan canvas freely. Scroll to zoom in/out.';
      case 'calibrate':
        return 'Click two points along a known wall to calibrate real-world meters.';
      case 'wall':
        return 'Click to start wall. Click to add segments (continuous). Right-click or Esc to stop.';
      case 'door':
        return 'Hover over any wall segment and click to snap a door opening.';
      case 'window':
        return 'Hover over any wall segment and click to snap an architectural window.';
      case 'room':
        return 'Click inside any room boundary to place a room label badge.';
      default:
        return 'Select a tool to start drafting.';
    }
  };

  return (
    <footer className="h-8 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 flex items-center justify-between text-[11px] text-slate-400 z-20 select-none">
      {/* Tool Hint */}
      <div className="flex items-center gap-2 truncate max-w-[55%]">
        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="text-slate-200 truncate">{getToolHint()}</span>
      </div>

      {/* Metrics & Architectural Metadata */}
      <div className="flex items-center gap-4 text-slate-400">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>
            {walls.length} walls · {openings.length} openings · {rooms.length} rooms
          </span>
        </div>

        <div className="h-3 w-px bg-slate-800 hidden sm:block" />

        <div className="flex items-center gap-1.5 hidden sm:flex">
          <Compass className="w-3.5 h-3.5 text-slate-500" />
          <span>Ortho: {isOrthoSnapEnabled ? '0°/45°/90°' : 'Off'}</span>
        </div>

        <div className="h-3 w-px bg-slate-800 hidden md:block" />

        <div className="flex items-center gap-1.5">
          <Ruler className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-amber-300 font-semibold">{pixelsPerMeter} px/m</span>
          <span className="text-slate-500">| H: {ceilingHeight}m</span>
        </div>
      </div>
    </footer>
  );
};
