'use client';

import React, { useState } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import {
  CheckCircle2,
  Circle,
  Box,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Layers,
  FileImage,
  Ruler,
  DoorOpen,
  Tag,
} from 'lucide-react';

export const ProjectReadinessCard: React.FC = () => {
  const { getReadinessChecklist, setCurrentMode, walls } = useFloorplanStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const checklist = getReadinessChecklist();

  const items = [
    {
      id: 'blueprint',
      label: 'Blueprint Image Attached',
      hint: 'Reference floorplan background',
      done: checklist.hasBlueprint,
      icon: FileImage,
    },
    {
      id: 'calibration',
      label: 'Metric Scale Calibrated',
      hint: 'Pixels-per-meter scale verified',
      done: checklist.isCalibrated,
      icon: Ruler,
    },
    {
      id: 'walls',
      label: `Structural Walls (${walls.length}/3+)`,
      hint: 'At least 3 walls drawn in 2D',
      done: checklist.hasWalls,
      icon: Layers,
      required: true,
    },
    {
      id: 'openings',
      label: 'Doors & Windows Cutouts',
      hint: 'At least 1 architectural opening',
      done: checklist.hasOpenings,
      icon: DoorOpen,
    },
    {
      id: 'rooms',
      label: 'Room Zones Labeled',
      hint: 'Living, Bedroom, or Kitchen marker',
      done: checklist.hasRooms,
      icon: Tag,
    },
  ];

  return (
    <div className="absolute bottom-14 right-4 z-20 w-80 glass-panel rounded-2xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden transition-all duration-300">
      {/* Header with Progress Bar & Collapse Toggle */}
      <div
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between cursor-pointer select-none hover:bg-slate-800/50 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight">Project Readiness</h4>
            <p className="text-[10px] text-slate-400">
              {checklist.completedCount} of {checklist.totalCount} milestones ({checklist.progressPercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {checklist.isReadyFor3D && (
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Ready
            </span>
          )}
          <button className="text-slate-400 hover:text-white p-0.5">
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-950 h-1">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${checklist.progressPercent}%` }}
        />
      </div>

      {/* Checklist Items */}
      {!isCollapsed && (
        <div className="p-3.5 space-y-2.5 bg-slate-950/60">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-start gap-2.5 text-xs group"
              >
                <div className="mt-0.5 shrink-0">
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold ${
                        item.done ? 'text-slate-200 line-through/10' : 'text-slate-300'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.required && !item.done && (
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">{item.hint}</p>
                </div>
                <Icon className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition shrink-0" />
              </div>
            );
          })}

          {/* 3D Generation Gate Button */}
          <div className="pt-2 border-t border-slate-800/80">
            {checklist.isReadyFor3D ? (
              <button
                onClick={() => setCurrentMode('3d')}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 transition group animate-pulse hover:animate-none"
              >
                <Box className="w-4 h-4 text-cyan-200" />
                <span>Generate 3D Architectural Scene</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </button>
            ) : (
              <div className="text-center p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                <span>Draw at least 3 walls in the 2D editor to unlock 3D extrusion.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
